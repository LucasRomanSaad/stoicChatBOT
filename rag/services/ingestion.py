import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentIngestionService:
    def __init__(self):
        self.chroma_path = os.getenv("CHROMA_PATH", "./research_db")
        self.pdfs_path = os.getenv("PDFS_PATH", "../data/pdfs")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        
        self.client = None
        self.collection = None
        self.embeddings_model = None
        self.text_splitter = None
        self.manifest_path = Path(self.chroma_path) / "ingestion_manifest.json"
        
    async def initialize(self):
        """Initialize the ingestion service."""
        try:
            os.makedirs(self.chroma_path, exist_ok=True)
            
            # Initialize ChromaDB
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            self.collection = self.client.get_or_create_collection(
                name="stoic_documents",
                metadata={"hnsw:space": "cosine"}
            )
            
            try:
                self.embeddings_model = HuggingFaceEmbeddings(
                    model_name=self.embedding_model_name
                )
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
            
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            logger.info("Document ingestion service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize ingestion service: {e}")
            raise
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            raise
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load the ingestion manifest."""
        if self.manifest_path.exists():
            with open(self.manifest_path, 'r') as f:
                return json.load(f)
        return {"files": {}}
    
    def _save_manifest(self, manifest: Dict[str, Any]):
        """Save the ingestion manifest."""
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    def _load_pdf(self, file_path: Path) -> List[Any]:
        """Load a PDF file and return its documents."""
        try:
            loader = PyPDFLoader(str(file_path))
            documents = loader.load()
            
            if not documents:
                logger.warning(f"No pages extracted from {file_path.name}")
                return []
            
            valid_documents = [doc for doc in documents if doc.page_content.strip()]
            
            if not valid_documents:
                logger.warning(f"No content found in {file_path.name}")
                return []
            
            logger.info(f"Successfully loaded {len(valid_documents)} pages from: {file_path.name}")
            return valid_documents
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return []
    
    def _chunk_documents(self, documents: List[Any], title: str) -> List[Dict[str, Any]]:
        """Split documents into chunks with metadata."""
        chunks = []
        
        for doc_idx, document in enumerate(documents):
            text_chunks = self.text_splitter.split_text(document.page_content)
            
            for chunk_idx, chunk_text in enumerate(text_chunks):
                chunk_id = f"{title}_doc{doc_idx}_{chunk_idx}"
                
                chunk_data = {
                    "content": chunk_text,
                    "title": title,
                    "chunk_id": chunk_id,
                    "page": document.metadata.get("page", None),
                    "source_path": str(document.metadata.get("source", ""))
                }
                chunks.append(chunk_data)
        
        return chunks
    
    def _embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        try:
            batch_size = 32
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_embeddings = self.embeddings_model.embed_documents(batch)
                all_embeddings.extend(batch_embeddings)
            
            return all_embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    def _insert_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Insert chunks into ChromaDB collection."""
        if not chunks:
            return 0
        
        try:
            next_id = self.collection.count()
            
            valid_chunks = [chunk for chunk in chunks if chunk["content"].strip()]
            
            if not valid_chunks:
                logger.warning("No valid chunks to insert after filtering")
                return 0
            
            documents_content = [chunk["content"] for chunk in valid_chunks]
            
            embeddings = self._embed_documents(documents_content)
            
            metadatas = [
                {
                    "title": chunk["title"],
                    "chunk_id": chunk["chunk_id"],
                    "page": chunk["page"],
                    "source_path": chunk["source_path"]
                }
                for chunk in valid_chunks
            ]
            
            ids = [f"chunk_{next_id + i}" for i in range(len(valid_chunks))]
            
            self.collection.add(
                embeddings=embeddings,
                ids=ids,
                documents=documents_content,
                metadatas=metadatas
            )
            
            logger.info(f"Successfully inserted {len(valid_chunks)} chunks into database")
            return len(valid_chunks)
            
        except Exception as e:
            logger.error(f"Error inserting chunks: {e}")
            raise
    
    async def ingest_pdfs(self) -> Dict[str, Any]:
        """
        Ingest all PDF files from the pdfs directory.
        Returns summary of ingestion process.
        """
        pdfs_dir = Path(self.pdfs_path)
        
        if not pdfs_dir.exists():
            raise FileNotFoundError(f"PDFs directory not found: {pdfs_dir}")
        
        manifest = self._load_manifest()
        
        pdf_files = list(pdfs_dir.glob("*.pdf"))
        
        if not pdf_files:
            logger.warning(f"No PDF files found in {pdfs_dir}")
            return {
                "message": "No PDF files found",
                "processed_files": [],
                "skipped_files": [],
                "total_chunks": 0
            }
        
        processed_files = []
        skipped_files = []
        total_chunks = 0
        
        for pdf_file in pdf_files:
            try:
                current_hash = self._calculate_file_hash(pdf_file)
                file_key = str(pdf_file.name)
                
                if file_key in manifest["files"]:
                    stored_hash = manifest["files"][file_key]["hash"]
                    if current_hash == stored_hash:
                        logger.info(f"Skipping unchanged file: {pdf_file.name}")
                        skipped_files.append(pdf_file.name)
                        continue
                
                logger.info(f"Processing: {pdf_file.name}")
                documents = self._load_pdf(pdf_file)
                
                if not documents:
                    logger.warning(f"No content extracted from: {pdf_file.name}")
                    continue
                
                title = pdf_file.stem.replace("_", " ").replace("-", " ").title()
                
                chunks = self._chunk_documents(documents, title)
                
                if chunks:
                    chunks_inserted = self._insert_chunks(chunks)
                    total_chunks += chunks_inserted
                    
                    manifest["files"][file_key] = {
                        "hash": current_hash,
                        "title": title,
                        "chunks": len(chunks),
                        "processed_at": datetime.now().isoformat()
                    }
                    
                    processed_files.append(pdf_file.name)
                    logger.info(f"Processed {pdf_file.name}: {len(chunks)} chunks")
                
            except Exception as e:
                logger.error(f"Error processing {pdf_file}: {e}")
                continue
        
        self._save_manifest(manifest)
        
        result = {
            "message": f"Ingestion completed. Processed {len(processed_files)} files, skipped {len(skipped_files)} files.",
            "processed_files": processed_files,
            "skipped_files": skipped_files,
            "total_chunks": total_chunks
        }
        
        logger.info(f"Ingestion summary: {result}")
        return result
    
    async def cleanup_knowledge_base(self) -> Dict[str, Any]:
        """
        Clean up the entire knowledge base by deleting all documents and resetting the manifest.
        """
        try:
            doc_count_before = self.collection.count()
            
            if doc_count_before > 0:
                all_docs = self.collection.get(include=[])
                if all_docs["ids"]:
                    self.collection.delete(ids=all_docs["ids"])
                    logger.info(f"Deleted {len(all_docs['ids'])} documents from collection")
            
            empty_manifest = {"files": {}}
            self._save_manifest(empty_manifest)
            logger.info("Reset ingestion manifest")
            
            doc_count_after = self.collection.count()
            
            result = {
                "documents_deleted": doc_count_before,
                "documents_remaining": doc_count_after,
                "manifest_reset": True,
                "cleanup_successful": doc_count_after == 0
            }
            
            logger.info(f"Cleanup completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            raise
