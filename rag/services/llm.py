import os
from typing import List, Dict, Any
from groq import Groq
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key or self.groq_api_key == "gsk_dummy_key_for_development":
            logger.warning("GROQ_API_KEY not set or using dummy key. LLM service will not work properly.")
            self.client = None
        else:
            self.client = Groq(api_key=self.groq_api_key)
        self.primary_model = "llama3-70b-8192"
        self.fallback_model = "llama3-8b-8192"
        self.max_tokens = 1000
        self.temperature = 0.3
        
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the Stoic guide."""
        return """You are a personal Stoic philosophy guide. I am here to provide thoughtful, practical guidance based on ancient Stoic teachings from philosophers like Marcus Aurelius, Epictetus, Seneca, and others.

GREETING AND INTRODUCTION DETECTION:
When users greet me or ask introductory questions like "Hello", "Hi", "What is your purpose?", "Who are you?", "What do you do?", respond with a warm, personal welcome that includes:
- "Hello! I'm your personal Stoic guide."
- Explain my purpose in first person: "My purpose is to help you navigate life's challenges using timeless Stoic wisdom."
- Be conversational and welcoming rather than formal or academic
- Invite them to share their thoughts or specific challenges
- Only use sources if they're highly relevant (similarity > 0.7) for greeting responses

PHILOSOPHICAL GUIDANCE PRINCIPLES:
For deeper philosophical questions and life challenges:
1. Draw from the provided source material from authentic Stoic texts
2. Be calm, clear, and practical in explanations
3. Connect ancient wisdom to modern situations when appropriate
4. If multiple sources seem to conflict, acknowledge the nuance and explain different perspectives
5. Maintain a tone that is wise but accessible, neither preachy nor academic
6. Focus on practical application of Stoic principles
7. If the retrieved sources don't contain relevant information (low similarity scores), be honest about the limitations

TONE GUIDELINES:
- Use "I" and "me" instead of "the guide" or "this system"
- Be conversational and personal, not formal or distant
- Show warmth and understanding for human struggles
- Speak as a trusted friend offering wisdom, not a lecturer
- For greetings: be welcoming and inviting
- For philosophical discussions: be thoughtful and practical

FORMATTING REQUIREMENTS:
- Format responses using markdown for better readability
- Use headings (##, ###) to organize main points and sections
- Use bullet points (-) or numbered lists for multiple items
- Use **bold** for key concepts and important phrases
- Use *italics* for emphasis and quotes from ancient texts
- Use > blockquotes for direct quotes from Stoic philosophers
- Break up long paragraphs into shorter, digestible sections
- Use horizontal rules (---) to separate different topics when appropriate

Remember: I am a personal guide drawing from authentic Stoic texts. For introductions and greetings, be warm and personal. For philosophical guidance, be faithful to the source material while making it relevant and accessible. Always format responses clearly using markdown."""

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
            # Handle both dict and object types
            if hasattr(msg, 'role'):
                role = msg.role.title()
                content = msg.content[:200] + "..." if len(msg.content) > 200 else msg.content
            else:
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
    
    def _is_greeting_or_introduction(self, query: str, conversation_context: List[Dict[str, str]] = None) -> bool:
        """Check if the query is a greeting or introductory question."""
        query_lower = query.lower().strip()
        
        # Check if this is the first message in conversation (no previous context)
        is_first_message = not conversation_context or len(conversation_context) == 0
        
        # Greeting patterns
        greeting_patterns = [
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'what is your purpose', 'what is your pourpose', 'who are you', 'what do you do',
            'what can you do', 'how can you help', 'what are you for', 'introduce yourself',
            'what is this', 'what is this app', 'what is this about'
        ]
        
        # Check for exact matches or if query starts with greeting
        for pattern in greeting_patterns:
            if query_lower == pattern or query_lower.startswith(pattern):
                return True
        
        # If it's the first message and query is very short (likely a greeting)
        if is_first_message and len(query.split()) <= 3:
            return True
            
        return False
    
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
        if not self.client:
            raise Exception("LLM service not properly initialized. Check GROQ_API_KEY.")
        
        try:
            # Check if this is a greeting or introduction
            is_greeting = self._is_greeting_or_introduction(query, conversation_context)
            
            # Build context
            source_context = self._build_context_from_sources(sources)
            conv_context = self._build_conversation_context(conversation_context or [])
            
            # Handle greetings differently
            if is_greeting:
                # For greetings, only use sources if they're highly relevant
                high_quality_sources = [s for s in sources if s['similarity'] >= 0.7] if sources else []
                if high_quality_sources:
                    source_context = self._build_context_from_sources(high_quality_sources)
                    user_message = f"""{conv_context}The user is greeting me with: "{query}"

Some relevant Stoic sources:
{source_context}

Respond with a warm, personal welcome as their Stoic guide. Introduce yourself in first person, explain your purpose, and invite them to share their thoughts or challenges. Keep it conversational and welcoming."""
                else:
                    # No relevant sources, provide a standard warm welcome
                    user_message = f"""{conv_context}The user is greeting me with: "{query}"

Respond with a warm, personal welcome as their Stoic guide. Introduce yourself in first person ("Hello! I'm your personal Stoic guide"), explain your purpose (to help navigate life's challenges using Stoic wisdom), and invite them to share their thoughts or specific challenges they're facing. Keep it conversational, welcoming, and personal - not formal or academic."""
            else:
                # Regular philosophical discussion
                # Check source quality
                source_quality_warning = ""
                if not self._check_source_quality(sources):
                    source_quality_warning = "\n\nNote: I have limited confidence in the relevance of the available sources for this question. Please take this response with appropriate caution."
                
                # Build the user message for philosophical guidance
                user_message = f"""{conv_context}Current question: {query}

Available Stoic sources:
{source_context}

Please provide a thoughtful response based on these Stoic teachings. Focus on practical wisdom and application. Speak as a personal guide using "I" and "me", maintaining a warm but wise tone.{source_quality_warning}"""

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
    
    def _build_title_system_prompt(self) -> str:
        """Build the system prompt for title generation."""
        return """You are a title generator for Stoic philosophy conversations. Generate concise, descriptive titles (3-6 words) that capture the essence of the philosophical topic being discussed.

Guidelines:
1. Focus on the main Stoic concept or theme being discussed
2. Use clear, accessible language (not overly academic)
3. Make it specific to the topic, not generic
4. Avoid phrases like "New Conversation" or "Chat about"
5. Examples: "Dealing with Criticism", "Finding Inner Peace", "Virtue vs Success", "Managing Difficult Emotions"

Return ONLY the title, no additional text."""

 
    
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
    
    async def generate_title(self, user_question: str, assistant_response: str) -> str:
        """
        Generate a concise title for a conversation based on the first exchange.
        
        Args:
            user_question: The user's initial question
            assistant_response: The assistant's response
            
        Returns:
            A concise title (3-6 words) focused on Stoic themes
        """
        if not self.client:
            raise Exception("LLM service not properly initialized. Check GROQ_API_KEY.")
        
        try:
            system_prompt = """You are a title generator for Stoic philosophy conversations. Generate concise, descriptive titles (3-6 words) that capture the essence of the topic being discussed.

Guidelines:
- Keep titles between 3-6 words
- Focus on the main Stoic concept or theme
- Make titles descriptive and meaningful
- Use title case
- Avoid generic phrases like "Discussion about" or "Question on"
- Capture the specific philosophical aspect being explored

Examples:
- "Building Emotional Resilience"
- "Virtue and Character Development"
- "Finding Purpose Through Stoicism"
- "Overcoming Life's Obstacles"
- "Daily Stoic Practice"
- "Managing Anger and Frustration"
- "Death and Mortality Reflection"
"""

            user_message = f"""Based on this conversation exchange, generate a concise title:

User Question: {user_question}

Assistant Response: {assistant_response[:500]}...

Generate only the title, nothing else."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Use the faster model for title generation
            response = self._call_groq(messages, self.fallback_model)
            title = response.choices[0].message.content.strip()
            
            # Clean up the title (remove quotes, ensure proper length)
            title = title.strip('"\'')
            words = title.split()
            if len(words) > 6:
                title = ' '.join(words[:6])
            
            logger.info(f"Generated title: '{title}'")
            return title
            
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            # Return a fallback title based on keywords in the user question
            words = user_question.lower().split()
            stoic_keywords = ['virtue', 'wisdom', 'courage', 'justice', 'temperance', 'stoic', 'philosophy', 'emotion', 'resilience']
            found_keywords = [word for word in words if word in stoic_keywords]
            if found_keywords:
                return f"Stoic {found_keywords[0].title()}"
            return "Stoic Wisdom Discussion"
