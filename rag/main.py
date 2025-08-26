from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import os
from pathlib import Path
import uvicorn
from services.ingestion import DocumentIngestionService
from services.retrieval import RetrievalService
from services.llm import LLMService

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

# Initialize services
ingestion_service = DocumentIngestionService()
retrieval_service = RetrievalService()
llm_service = LLMService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the RAG system on startup."""
    try:
        await ingestion_service.initialize()
        await retrieval_service.initialize()
        print("🚀 RAG service initialized successfully")
        yield
    except Exception as e:
        print(f"❌ Failed to initialize RAG service: {e}")
        yield

app = FastAPI(title="Personal Stoic Guide RAG Service", version="1.0.0", lifespan=lifespan)

# Request/Response models
class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    query: str
    conversation_context: Optional[List[Message]] = []
    top_k: Optional[int] = 3

class Source(BaseModel):
    title: str
    chunk_id: str
    page: Optional[int] = None
    similarity: float
    snippet: str

class Usage(BaseModel):
    tokens_prompt: int
    tokens_completion: int
    model: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
    usage: Usage

class IngestionResponse(BaseModel):
    message: str
    processed_files: List[str]
    skipped_files: List[str]
    total_chunks: int

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Personal Stoic Guide RAG"}

@app.post("/ingest", response_model=IngestionResponse)
async def ingest_documents(background_tasks: BackgroundTasks):
    """
    Ingest PDF documents from the data/pdfs directory.
    This endpoint is idempotent - unchanged files will be skipped.
    """
    try:
        result = await ingestion_service.ingest_pdfs()
        return IngestionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Generate a response to a user query using RAG.
    
    Args:
        request: ChatRequest containing query, optional conversation context, and top_k
        
    Returns:
        ChatResponse with answer, sources, and usage information
    """
    try:
        # Retrieve relevant documents
        sources = await retrieval_service.retrieve_documents(
            query=request.query,
            top_k=request.top_k
        )
        
        # Build conversation context
        context_messages = []
        if request.conversation_context:
            # Take last 6 messages for context
            context_messages = request.conversation_context[-6:]
        
        # Generate response using LLM
        response = await llm_service.generate_response(
            query=request.query,
            sources=sources,
            conversation_context=context_messages
        )
        
        # Format sources for response
        formatted_sources = [
            Source(
                title=source["title"],
                chunk_id=source["chunk_id"],
                page=source.get("page"),
                similarity=source["similarity"],
                snippet=source["content"][:200] + "..." if len(source["content"]) > 200 else source["content"]
            )
            for source in sources
        ]
        
        return ChatResponse(
            answer=response["answer"],
            sources=formatted_sources,
            usage=response["usage"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.get("/stats")
async def get_stats():
    """Get statistics about the document collection."""
    try:
        stats = await retrieval_service.get_collection_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats failed: {str(e)}")

@app.post("/cleanup")
async def cleanup_knowledge_base():
    """
    Clean up the entire knowledge base by deleting all documents and resetting the manifest.
    This will force a complete re-ingestion on the next /ingest call.
    """
    try:
        result = await ingestion_service.cleanup_knowledge_base()
        return {"message": "Knowledge base cleaned successfully", "details": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("RAG_PORT", "8001"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
