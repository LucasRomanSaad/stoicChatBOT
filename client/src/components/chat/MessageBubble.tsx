import { motion } from "framer-motion";
import { Message } from "@shared/schema";
import { SourceCitation } from "./SourceCitation";
import { Brain, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
                <p className="text-foreground leading-relaxed" data-testid={`message-content-${message.id}`}>
                  {message.content}
                </p>
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
