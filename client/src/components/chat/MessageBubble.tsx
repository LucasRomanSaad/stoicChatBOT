import { motion } from "framer-motion";
import { Message } from "@shared/schema";
import { SourceCitation } from "./SourceCitation";
import { Brain, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAssistant ? "justify-start" : "justify-end"} ${isLast ? "mb-6" : "mb-4"}`}
      data-testid={`message-${message.id}`}
    >
      <div className={`max-w-4xl ${isAssistant ? "w-full" : ""}`}>
        {isAssistant ? (
          <div className="flex items-start space-x-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            >
              <Brain className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
              >
                <div className="text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert" data-testid={`message-content-${message.id}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({children}) => <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h3>,
                      p: ({children}) => <p className="mb-3 last:mb-0 text-foreground">{children}</p>,
                      ul: ({children}) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="mb-3 ml-4 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-foreground">{children}</li>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-3 text-muted-foreground">{children}</blockquote>,
                      strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({children}) => <em className="italic text-foreground">{children}</em>,
                      code: ({children}) => <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                      pre: ({children}) => <pre className="bg-muted-foreground/10 p-3 rounded-lg overflow-x-auto my-3">{children}</pre>,
                      hr: () => <hr className="border-border my-4" />
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </motion.div>

              {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                <SourceCitation sources={message.sources} />
              )}

              <p className="text-xs text-muted-foreground mt-2" data-testid={`message-timestamp-${message.id}`}>
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm ml-auto max-w-2xl"
              >
                <p className="leading-relaxed" data-testid={`message-content-${message.id}`}>
                  {message.content}
                </p>
              </motion.div>
              <p className="text-xs text-muted-foreground text-right mt-1" data-testid={`message-timestamp-${message.id}`}>
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
