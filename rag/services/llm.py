import os
from typing import List, Dict, Any
from groq import Groq
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
        
        self.client = Groq(api_key=self.groq_api_key)
        self.primary_model = "llama3-70b-8192"
        self.fallback_model = "llama3-8b-8192"
        self.max_tokens = 1000
        self.temperature = 0.3
        
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the Stoic guide."""
        return """You are a wise and knowledgeable Stoic philosophy guide. Your role is to provide thoughtful, practical guidance based on ancient Stoic teachings from philosophers like Marcus Aurelius, Epictetus, Seneca, and others.

Key principles to follow:
1. Always base your responses on the provided source material from Stoic texts
2. Be calm, clear, and practical in your explanations
3. Connect ancient wisdom to modern situations when appropriate
4. If multiple sources seem to conflict, acknowledge the nuance and explain different perspectives
5. Maintain a tone that is wise but accessible, neither preachy nor academic
6. Focus on practical application of Stoic principles
7. If the retrieved sources don't contain relevant information (low similarity scores), be honest about the limitations

Remember: You are drawing from authentic Stoic texts to provide guidance. Be faithful to the source material while making it relevant and accessible."""

    def _build_context_from_sources(self, sources: List[Dict[str, Any]]) -> str:
        """Build context string from retrieved sources."""
        if not sources:
            return "No relevant sources found."
        
        context_parts = []
        for i, source in enumerate(sources, 1):
            similarity_note = f"(Similarity: {source['similarity']:.3f})"
            source_info = f"From '{source['title']}'"
            if source.get('page'):
                source_info += f", page {source['page']}"
            
            context_parts.append(
                f"Source {i} {similarity_note} - {source_info}:\n{source['content']}\n"
            )
        
        return "\n".join(context_parts)
    
    def _build_conversation_context(self, conversation_context: List[Dict[str, str]]) -> str:
        """Build conversation context from previous messages."""
        if not conversation_context:
            return ""
        
        context_parts = ["Previous conversation context:"]
        for msg in conversation_context:
            role = msg['role'].title()
            content = msg['content'][:200] + "..." if len(msg['content']) > 200 else msg['content']
            context_parts.append(f"{role}: {content}")
        
        return "\n".join(context_parts) + "\n\n"
    
    def _check_source_quality(self, sources: List[Dict[str, Any]]) -> bool:
        """Check if the sources are of sufficient quality for a confident response."""
        if not sources:
            return False
        
        # Check if the best source has reasonable similarity
        best_similarity = max(source['similarity'] for source in sources)
        return best_similarity >= 0.5
    
    async def generate_response(
        self,
        query: str,
        sources: List[Dict[str, Any]],
        conversation_context: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a response using the Groq LLM.
        
        Args:
            query: The user's question
            sources: Retrieved source documents
            conversation_context: Previous conversation messages
            
        Returns:
            Dictionary with answer and usage information
        """
        try:
            # Build context
            source_context = self._build_context_from_sources(sources)
            conv_context = self._build_conversation_context(conversation_context or [])
            
            # Check source quality
            source_quality_warning = ""
            if not self._check_source_quality(sources):
                source_quality_warning = "\n\nNote: I have limited confidence in the relevance of the available sources for this question. Please take this response with appropriate caution."
            
            # Build the user message
            user_message = f"""{conv_context}Current question: {query}

Available Stoic sources:
{source_context}

Please provide a thoughtful response based on these Stoic teachings. Focus on practical wisdom and application.{source_quality_warning}"""

            # Prepare messages
            messages = [
                {"role": "system", "content": self._build_system_prompt()},
                {"role": "user", "content": user_message}
            ]
            
            # Try primary model first
            try:
                response = self._call_groq(messages, self.primary_model)
                model_used = self.primary_model
            except Exception as e:
                logger.warning(f"Primary model failed: {e}. Trying fallback model.")
                response = self._call_groq(messages, self.fallback_model)
                model_used = self.fallback_model
            
            # Extract response content
            answer = response.choices[0].message.content
            
            # Calculate token usage
            usage_info = {
                "tokens_prompt": response.usage.prompt_tokens,
                "tokens_completion": response.usage.completion_tokens,
                "model": model_used
            }
            
            logger.info(f"Generated response using {model_used}")
            
            return {
                "answer": answer,
                "usage": usage_info
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise Exception(f"Failed to generate response: {str(e)}")
    
    def _call_groq(self, messages: List[Dict[str, str]], model: str):
        """Make a call to the Groq API."""
        return self.client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            top_p=0.9,
            stream=False
        )
