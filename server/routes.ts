import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import session from "express-session";
import { registerSchema, loginSchema, insertConversationSchema, insertMessageSchema, type ChatResponse } from "@shared/schema";
import { z } from "zod";

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'guest-session-secret-change-this',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
};

// Combined authentication middleware 
const authenticateUserOrGuest = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Try JWT authentication first
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      const user = await storage.getUser(decoded.userId);
      if (user) {
        req.user = user;
        req.isGuest = false;
        return next();
      }
    } catch (error) {
      // JWT failed, fall through to guest session
    }
  }

  // Fall back to guest session
  if (req.session) {
    req.isGuest = true;
    req.sessionId = req.session.id;
    return next();
  }

  return res.status(401).json({ message: 'Authentication required' });
};

// Rate limiting helper (simple in-memory)
const rateLimiter = new Map();
const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimiter.has(key)) {
      rateLimiter.set(key, []);
    }

    const requests = rateLimiter.get(key).filter((time: number) => time > windowStart);
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({ message: 'Too many requests' });
    }

    requests.push(now);
    rateLimiter.set(key, requests);
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session(sessionConfig));

  // CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Auth routes
  app.post('/api/auth/register', rateLimit(5, 15 * 60 * 100000), async (req, res) => {
    try {
      const { email, password } = registerSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await storage.createUser({ email, passwordHash });
      
      // Generate JWT
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
      
      res.json({ 
        user: { id: user.id, email: user.email }, 
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Register error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
      
      res.json({ 
        user: { id: user.id, email: user.email }, 
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/me', authenticateUserOrGuest, async (req: any, res) => {
    if (req.isGuest) {
      res.json({ 
        user: null, 
        isGuest: true, 
        sessionId: req.sessionId 
      });
    } else {
      res.json({ 
        user: { id: req.user.id, email: req.user.email },
        isGuest: false
      });
    }
  });

  // Guest session initialization
  app.post('/api/auth/guest', (req: any, res) => {
    if (!req.session.id) {
      return res.status(500).json({ message: 'Failed to create session' });
    }
    res.json({ 
      sessionId: req.session.id,
      message: 'Guest session created' 
    });
  });

  // Conversation routes
  app.get('/api/conversations', authenticateUserOrGuest, async (req: any, res) => {
    try {
      if (req.isGuest) {
        const conversations = await storage.getGuestConversations(req.sessionId);
        res.json(conversations);
      } else {
        const conversations = await storage.getUserConversations(req.user.id);
        res.json(conversations);
      }
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/conversations', authenticateUserOrGuest, async (req: any, res) => {
    try {
      const { title } = req.body;
      
      if (req.isGuest) {
        const conversation = await storage.createGuestConversation(
          req.sessionId,
          title || 'New Conversation'
        );
        res.json(conversation);
      } else {
        const conversation = await storage.createConversation({
          userId: req.user.id,
          title: title || 'New Conversation'
        });
        res.json(conversation);
      }
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/conversations/:id/messages', authenticateUserOrGuest, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      
      if (req.isGuest) {
        const messages = await storage.getGuestConversationMessages(conversationId, req.sessionId);
        res.json(messages);
      } else {
        const numericId = parseInt(conversationId);
        if (isNaN(numericId)) {
          return res.status(400).json({ message: 'Invalid conversation ID' });
        }
        const messages = await storage.getConversationMessages(numericId, req.user.id);
        res.json(messages);
      }
    } catch (error) {
      console.error('Get messages error:', error);
      if (error instanceof Error && error.message === 'Conversation not found') {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/conversations/:id/messages', authenticateUserOrGuest, rateLimit(30, 60 * 1000), async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      let userMessage: any;
      let recentMessages: any[];
      
      if (req.isGuest) {
        // Verify guest conversation exists
        const conversation = await storage.getGuestConversation(conversationId, req.sessionId);
        if (!conversation) {
          return res.status(404).json({ message: 'Conversation not found' });
        }

        // Save user message for guest
        userMessage = await (storage as any).createGuestMessageWithSession(
          conversationId,
          req.sessionId,
          'user',
          content.trim()
        );

        // Get recent conversation context
        recentMessages = await storage.getGuestConversationMessages(conversationId, req.sessionId);
      } else {
        const numericId = parseInt(conversationId);
        if (isNaN(numericId)) {
          return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        // Verify user conversation exists
        const conversation = await storage.getConversation(numericId, req.user.id);
        if (!conversation) {
          return res.status(404).json({ message: 'Conversation not found' });
        }

        // Save user message
        userMessage = await storage.createMessage({
          conversationId: numericId,
          role: 'user',
          content: content.trim(),
          sources: null
        });

        // Get recent conversation context
        recentMessages = await storage.getConversationMessages(numericId, req.user.id);
      }

      const contextMessages = recentMessages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Python RAG service
      const ragServiceUrl = process.env.RAG_SERVICE_URL || 'http://localhost:8001';
      const ragResponse = await fetch(`${ragServiceUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content.trim(),
          conversation_context: contextMessages,
          top_k: 3
        })
      });

      if (!ragResponse.ok) {
        throw new Error(`RAG service error: ${ragResponse.status}`);
      }

      const ragData: ChatResponse = await ragResponse.json();

      // Save assistant message with sources
      let assistantMessage: any;
      
      if (req.isGuest) {
        assistantMessage = await (storage as any).createGuestMessageWithSession(
          conversationId,
          req.sessionId,
          'assistant',
          ragData.answer,
          ragData.sources
        );
      } else {
        assistantMessage = await storage.createMessage({
          conversationId: parseInt(conversationId),
          role: 'assistant',
          content: ragData.answer,
          sources: ragData.sources
        });
      }

      res.json({
        userMessage,
        assistantMessage,
        usage: ragData.usage
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to process message' });
    }
  });

  app.delete('/api/conversations/:id', authenticateUserOrGuest, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      
      if (req.isGuest) {
        await storage.deleteGuestConversation(conversationId, req.sessionId);
      } else {
        const numericId = parseInt(conversationId);
        if (isNaN(numericId)) {
          return res.status(400).json({ message: 'Invalid conversation ID' });
        }
        await storage.deleteConversation(numericId, req.user.id);
      }
      
      res.json({ message: 'Conversation deleted' });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // RAG ingestion endpoint (admin only for now)
  app.post('/api/admin/ingest', async (req, res) => {
    try {
      const ragServiceUrl = process.env.RAG_SERVICE_URL || 'http://localhost:8001';
      const ragResponse = await fetch(`${ragServiceUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!ragResponse.ok) {
        throw new Error(`RAG service error: ${ragResponse.status}`);
      }

      const result = await ragResponse.json();
      res.json(result);
    } catch (error) {
      console.error('Ingestion error:', error);
      res.status(500).json({ message: 'Failed to ingest documents' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
