# Personal Stoic Guide RAG Web Application

## Overview

The Personal Stoic Guide is a production-ready web application that provides AI-powered philosophical guidance through Stoic teachings. The application features a conversational chat interface backed by a Retrieval-Augmented Generation (RAG) system that searches through a corpus of Stoic philosophical texts to provide contextually relevant advice with proper source citations.

The system is designed as a modern full-stack application with clear separation of concerns between the frontend user interface, backend API layer, RAG processing service, and data persistence layer.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript, utilizing modern development practices and comprehensive UI components. Key architectural decisions include:

- **React with TypeScript**: Provides type safety and improved developer experience
- **Wouter for Routing**: Lightweight alternative to React Router for client-side navigation
- **TanStack Query**: Handles server state management, caching, and API interactions
- **Radix UI + shadcn/ui**: Provides accessible, customizable component library
- **Tailwind CSS**: Utility-first CSS framework for consistent styling
- **Framer Motion**: Smooth animations and transitions throughout the interface
- **Theme Provider**: Built-in dark/light mode support

The frontend follows a component-based architecture with clear separation between:
- **Pages**: Route-level components (auth, dashboard, chat)
- **Components**: Reusable UI components organized by functionality
- **Hooks**: Custom React hooks for shared logic
- **Services**: API interaction layer

### Backend Architecture
The backend uses Node.js with Express, serving as both the web API and authentication layer, plus a gateway to the Python RAG service.

**Core Components:**
- **Express Server**: RESTful API with comprehensive middleware stack
- **Authentication System**: JWT-based stateless authentication with bcrypt password hashing
- **Database Layer**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage Abstraction**: Clean interface for data operations supporting multiple storage backends

**Database Schema:**
- **Users**: Core user management with email/password authentication
- **Conversations**: Chat session management tied to individual users
- **Messages**: Individual chat messages with role-based distinction and source citations stored as JSONB

**Security Features:**
- Input validation using Zod schemas
- Rate limiting to prevent abuse
- CORS configuration for cross-origin requests
- Secure password storage with bcrypt
- JWT token-based authentication

### RAG Service Architecture
The RAG system is implemented as a separate Python FastAPI service, providing complete isolation of AI/ML operations from the main web application.

**Key Components:**
- **FastAPI Service**: High-performance async API for RAG operations
- **ChromaDB**: Persistent vector database for document embeddings
- **HuggingFace Embeddings**: Free sentence-transformer models for document encoding
- **Groq LLM Integration**: Primary model (llama3-70b-8192) with fallback support
- **Document Processing**: PDF ingestion with intelligent chunking strategies

**RAG Pipeline:**
1. **Document Ingestion**: Idempotent PDF processing with file change detection
2. **Text Chunking**: Recursive character splitting for optimal context windows
3. **Vector Storage**: Persistent embeddings in ChromaDB with cosine similarity
4. **Retrieval**: Top-k similarity search for relevant context
5. **Generation**: Context-aware prompt construction with Groq LLM calls
6. **Citation**: Source tracking with similarity scores and document metadata

### Data Flow Architecture
The application follows a clear data flow pattern:

1. **User Interaction**: Frontend captures user input and manages UI state
2. **API Gateway**: Backend validates requests, handles authentication, and routes to appropriate services
3. **RAG Processing**: Python service processes queries against document corpus
4. **Response Assembly**: Backend combines RAG results with metadata and persists to database
5. **Real-time Updates**: Frontend updates via TanStack Query's reactive patterns

### Conversation Management
Conversations are designed as isolated chat sessions where:
- Each conversation maintains independent message history
- Messages are ordered chronologically within conversations
- Assistant responses include source citations with similarity scores
- Users can create multiple conversations for different topics

## External Dependencies

### Core Infrastructure
- **Neon Database**: Managed PostgreSQL hosting with connection pooling
- **Groq**: LLM API service for chat completions with model fallback support

### AI/ML Stack
- **ChromaDB**: Vector database for embeddings storage and similarity search
- **HuggingFace Transformers**: Sentence embedding models (all-MiniLM-L6-v2)
- **LangChain**: Document processing and text splitting utilities

### Authentication & Security
- **bcrypt**: Secure password hashing
- **jsonwebtoken**: JWT token generation and validation

### Frontend Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Framer Motion**: Animation library
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation

### Development Tools
- **TypeScript**: Static type checking across the entire stack
- **Vite**: Fast development server and build tool
- **Drizzle ORM**: Type-safe database operations with migration support
- **ESBuild**: Fast JavaScript bundling for production builds

### Document Processing
- **PyPDF**: PDF document parsing and text extraction
- **Python Multipart**: File upload handling in FastAPI