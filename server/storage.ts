import { users, conversations, messages, type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type GuestConversation, type GuestMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversations (User-based)
  getConversation(id: number, userId: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: number, userId: number, title: string): Promise<void>;
  deleteConversation(id: number, userId: number): Promise<void>;

  // Messages (User-based)
  getConversationMessages(conversationId: number, userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number, conversationId: number, userId: number): Promise<void>;

  // Guest Conversations
  getGuestConversation(id: string, sessionId: string): Promise<GuestConversation | undefined>;
  getGuestConversations(sessionId: string): Promise<GuestConversation[]>;
  createGuestConversation(sessionId: string, title?: string): Promise<GuestConversation>;
  updateGuestConversationTitle(id: string, sessionId: string, title: string): Promise<void>;
  deleteGuestConversation(id: string, sessionId: string): Promise<void>;

  // Guest Messages
  getGuestConversationMessages(conversationId: string, sessionId: string): Promise<GuestMessage[]>;
  createGuestMessage(conversationId: string, role: 'user' | 'assistant', content: string, sources?: any, responseType?: 'greeting' | 'philosophical' | 'general'): Promise<GuestMessage>;
  deleteGuestMessage(id: string, conversationId: string, sessionId: string): Promise<void>;

  // Session cleanup
  cleanupExpiredSessions(): Promise<void>;
}

class DatabaseStorage {
  // This class only implements user-related database operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getConversation(id: number, userId: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation || undefined;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversationTitle(id: number, userId: number, title: string): Promise<void> {
    await db
      .update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async getConversationMessages(conversationId: number, userId: number): Promise<Message[]> {
    // First verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async deleteMessage(id: number, conversationId: number, userId: number): Promise<void> {
    // First verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await db
      .delete(messages)
      .where(and(eq(messages.id, id), eq(messages.conversationId, conversationId)));
  }
}

// In-memory storage for guest sessions
class GuestSessionStorage {
  private conversations: Map<string, GuestConversation[]> = new Map();
  private messages: Map<string, GuestMessage[]> = new Map();
  private sessionTimestamps: Map<string, Date> = new Map();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  isSessionExpired(sessionId: string): boolean {
    const timestamp = this.sessionTimestamps.get(sessionId);
    if (!timestamp) return true;
    return Date.now() - timestamp.getTime() > this.SESSION_TIMEOUT;
  }

  touchSession(sessionId: string): void {
    this.sessionTimestamps.set(sessionId, new Date());
  }

  getGuestConversations(sessionId: string): GuestConversation[] {
    if (this.isSessionExpired(sessionId)) {
      this.cleanupSession(sessionId);
      return [];
    }
    this.touchSession(sessionId);
    return this.conversations.get(sessionId) || [];
  }

  createGuestConversation(sessionId: string, title: string): GuestConversation {
    this.touchSession(sessionId);
    const conversation: GuestConversation = {
      id: this.generateId(),
      sessionId,
      title,
      createdAt: new Date()
    };
    
    const sessionConversations = this.conversations.get(sessionId) || [];
    sessionConversations.unshift(conversation);
    this.conversations.set(sessionId, sessionConversations);
    
    return conversation;
  }

  getGuestConversation(id: string, sessionId: string): GuestConversation | undefined {
    if (this.isSessionExpired(sessionId)) {
      this.cleanupSession(sessionId);
      return undefined;
    }
    this.touchSession(sessionId);
    const conversations = this.conversations.get(sessionId) || [];
    return conversations.find(c => c.id === id);
  }

  updateGuestConversationTitle(id: string, sessionId: string, title: string): void {
    if (this.isSessionExpired(sessionId)) {
      this.cleanupSession(sessionId);
      return;
    }
    
    this.touchSession(sessionId);
    const conversations = this.conversations.get(sessionId) || [];
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      conversation.title = title;
      this.conversations.set(sessionId, conversations);
    }
  }

  deleteGuestConversation(id: string, sessionId: string): void {
    if (this.isSessionExpired(sessionId)) {
      this.cleanupSession(sessionId);
      return;
    }
    
    const conversations = this.conversations.get(sessionId) || [];
    const filtered = conversations.filter(c => c.id !== id);
    this.conversations.set(sessionId, filtered);
    
    // Also delete all messages for this conversation
    const messages = this.messages.get(sessionId) || [];
    const filteredMessages = messages.filter(m => m.conversationId !== id);
    this.messages.set(sessionId, filteredMessages);
  }

  getGuestConversationMessages(conversationId: string, sessionId: string): GuestMessage[] {
    if (this.isSessionExpired(sessionId)) {
      this.cleanupSession(sessionId);
      return [];
    }
    this.touchSession(sessionId);
    const messages = this.messages.get(sessionId) || [];
    return messages.filter(m => m.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  createGuestMessage(conversationId: string, sessionId: string, role: 'user' | 'assistant', content: string, sources?: any, responseType?: 'greeting' | 'philosophical' | 'general'): GuestMessage {
    this.touchSession(sessionId);
    const message: GuestMessage = {
      id: this.generateId(),
      conversationId,
      role,
      content,
      sources,
      responseType: responseType || 'general',
      createdAt: new Date()
    };
    
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);
    
    return message;
  }

  deleteGuestMessage(id: string, conversationId: string, sessionId: string): void {
    const messages = this.messages.get(sessionId) || [];
    const filtered = messages.filter(m => !(m.id === id && m.conversationId === conversationId));
    this.messages.set(sessionId, filtered);
  }

  cleanupSession(sessionId: string): void {
    this.conversations.delete(sessionId);
    this.messages.delete(sessionId);
    this.sessionTimestamps.delete(sessionId);
  }

  cleanupExpiredSessions(): void {
    const sessionIds = Array.from(this.sessionTimestamps.keys());
    for (const sessionId of sessionIds) {
      if (this.isSessionExpired(sessionId)) {
        this.cleanupSession(sessionId);
      }
    }
  }
}

// Combined storage class that implements both database and guest storage
export class CombinedStorage extends DatabaseStorage implements IStorage {
  private guestStorage = new GuestSessionStorage();

  // Guest conversation methods
  async getGuestConversation(id: string, sessionId: string): Promise<GuestConversation | undefined> {
    return this.guestStorage.getGuestConversation(id, sessionId);
  }

  async getGuestConversations(sessionId: string): Promise<GuestConversation[]> {
    return this.guestStorage.getGuestConversations(sessionId);
  }

  async createGuestConversation(sessionId: string, title: string = 'New Conversation'): Promise<GuestConversation> {
    return this.guestStorage.createGuestConversation(sessionId, title);
  }

  async updateGuestConversationTitle(id: string, sessionId: string, title: string): Promise<void> {
    return this.guestStorage.updateGuestConversationTitle(id, sessionId, title);
  }

  async deleteGuestConversation(id: string, sessionId: string): Promise<void> {
    return this.guestStorage.deleteGuestConversation(id, sessionId);
  }

  // Guest message methods
  async getGuestConversationMessages(conversationId: string, sessionId: string): Promise<GuestMessage[]> {
    return this.guestStorage.getGuestConversationMessages(conversationId, sessionId);
  }

  async createGuestMessage(conversationId: string, role: 'user' | 'assistant', content: string, sources?: any, responseType?: 'greeting' | 'philosophical' | 'general'): Promise<GuestMessage> {
    // We need sessionId but it's not in the interface signature, we'll handle this in routes
    throw new Error('Use createGuestMessageWithSession instead');
  }

  async createGuestMessageWithSession(conversationId: string, sessionId: string, role: 'user' | 'assistant', content: string, sources?: any, responseType?: 'greeting' | 'philosophical' | 'general'): Promise<GuestMessage> {
    return this.guestStorage.createGuestMessage(conversationId, sessionId, role, content, sources, responseType);
  }

  async deleteGuestMessage(id: string, conversationId: string, sessionId: string): Promise<void> {
    return this.guestStorage.deleteGuestMessage(id, conversationId, sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    return this.guestStorage.cleanupExpiredSessions();
  }
}

export const storage = new CombinedStorage();

// Cleanup expired sessions every hour
setInterval(() => {
  storage.cleanupExpiredSessions().catch(console.error);
}, 60 * 60 * 1000);
