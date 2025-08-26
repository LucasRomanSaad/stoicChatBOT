
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { conversationService } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollText, Send, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatInterfaceProps {
  conversationId: number;
  onDeleteConversation: () => void;
}

export function ChatInterface({ conversationId, onDeleteConversation }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isTitleGenerating, setIsTitleGenerating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: () => conversationService.getMessages(conversationId),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 2000, 
  });

  const currentConversation = conversations.find((c: any) => c.id === conversationId || c.id === conversationId.toString());

  console.log("Current Conversation:", currentConversation)

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => conversationService.sendMessage(conversationId, content),
    onMutate: () => {
      setIsTyping(true);
      if (!messages || messages.length === 0) {
        setIsTitleGenerating(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      setMessage("");
      setIsTyping(false);
      setIsTitleGenerating(false);
    },
    onError: (error: any) => {
      setIsTyping(false);
      setIsTitleGenerating(false);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "Please try again.",
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: () => conversationService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onDeleteConversation();
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete conversation",
        description: error.message || "Please try again.",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    const content = message.trim();
    if (!content) return;

    sendMessageMutation.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const handleDeleteConversation = () => {
    deleteConversationMutation.mutate();
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
      >
        <div className="text-center">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity }
            }}
            className="relative mx-auto mb-6 w-16 h-16"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 opacity-20 blur-lg"></div>
            <div className="relative w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary bg-background shadow-xl"></div>
          </motion.div>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground font-medium"
          >
            Loading conversation...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10 pointer-events-none" />
      
      {/* Chat Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5 dark:shadow-black/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shadow-lg border border-primary/20"
              >
                <ScrollText className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <AnimatePresence mode="wait">
                  <motion.h2 
                    key={`${conversationId}-${currentConversation?.title || "Stoic Wisdom"}`}
                    initial={{ x: -20, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: 20, opacity: 0, scale: 0.9 }}
                    transition={{ 
                      duration: 0.5, 
                      type: "spring", 
                      stiffness: 120,
                      damping: 15,
                      ease: "easeOut"
                    }}
                    className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text" 
                    data-testid="conversation-title"
                  >
                    {currentConversation?.title || "Stoic Wisdom"}
                  </motion.h2>
                </AnimatePresence>
                <AnimatePresence>
                  {isTitleGenerating && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: -10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 rounded-full bg-gradient-to-r from-primary/60 to-primary/80 border border-primary/30"
                        />
                        <span className="text-xs text-primary/80 font-medium">
                          Generating title...
                        </span>
                      </div>
                    </motion.div>
                  )}
                  {!isTitleGenerating && currentConversation?.title && currentConversation.title !== "New Conversation" && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: -10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="mt-1"
                    >
                      <div className="flex items-center space-x-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400/60 to-green-500/60"
                        />
                        <span className="text-xs text-muted-foreground font-medium">
                          AI Generated Title
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
              <AlertDialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-3 hover:bg-destructive/10 text-destructive transition-all duration-200 rounded-xl border border-transparent hover:border-destructive/20 hover:shadow-lg hover:shadow-destructive/10"
                    disabled={deleteConversationMutation.isPending}
                    data-testid="button-delete-conversation"
                  >
                    <Trash2 className="w-5 h-5 text" />
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-2 border-red-500">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    Delete Conversation
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this conversation? This action cannot be undone and all messages in this conversation will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConversation}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConversationMutation.isPending}
                  >
                    {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>

      {/* Messages Container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex-1 overflow-y-auto relative" 
        data-testid="messages-container"
      >
        <div className="p-6 space-y-8 max-w-4xl mx-auto">
          {messages && messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
                className="relative inline-flex items-center justify-center w-24 h-24 mb-8"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-2xl">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </motion.div>
              
              <motion.h3 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text "
              >
                Welcome to your Personal Stoic Guide
              </motion.h3>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground max-w-md mx-auto leading-relaxed"
              >
                Ask me anything about Stoic philosophy. I'll draw wisdom from Marcus Aurelius, 
                Epictetus, Seneca, and other great Stoic thinkers to guide you.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-wrap gap-3 justify-center"
              >
                {["Virtue & Character", "Emotional Resilience", "Life Purpose", "Daily Practice"].map((topic, index) => (
                  <motion.button
                    key={topic}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const topicMessage = `Explain the stoicism view on ${topic}`;
                      sendMessageMutation.mutate(topicMessage);
                    }}
                    disabled={sendMessageMutation.isPending}
                    className="
                        px-4 py-2 rounded-full text-sm font-medium
                        transition-all duration-200 transform
                        shadow-sm
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                        disabled:opacity-50 disabled:cursor-not-allowed
                        motion-reduce:transition-none motion-reduce:transform-none

                        bg-white text-gray-800 border border-gray-200
                        hover:bg-blue-500 hover:text-white hover:border-blue-400 hover:shadow-md hover:scale-105

                        dark:bg-gray-800 dark:text-white/80 dark:border-primary/20
                        dark:hover:bg-blue-600 dark:hover:text-white dark:hover:border-primary/30
                      "
                    >
                    {topic}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages?.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <MessageBubble
                    message={msg}
                    isLast={index === messages.length - 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Enhanced Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                className="flex justify-start"
              >
                <div className="flex items-start space-x-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 bg-gradient-to-br from-muted to-muted/70 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border border-border/50"
                  >
                    <ScrollText className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-br from-muted/90 to-muted/70 backdrop-blur-sm rounded-2xl rounded-bl-md px-6 py-4 shadow-xl border border-border/30"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        {[0, 0.2, 0.4].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-2.5 h-2.5 bg-primary/60 rounded-full"
                            animate={{ 
                              scale: [1, 1.3, 1],
                              opacity: [0.4, 1, 0.4] 
                            }}
                            transition={{ 
                              duration: 1.4, 
                              repeat: Infinity, 
                              delay: delay,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">Contemplating wisdom...</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* Enhanced Message Input */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-black/30"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative p-6">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              whileFocus={{ scale: 1.02 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              
              <div className="relative bg-background/90 backdrop-blur-sm rounded-2xl border border-border/60 shadow-xl group-focus-within:border-primary/50 group-focus-within:shadow-2xl group-focus-within:shadow-primary/10 transition-all duration-300">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts or ask about Stoic wisdom..."
                  className="resize-none pr-16 min-h-[52px] max-h-[120px] border-none bg-transparent focus:ring-0 text-base placeholder:text-muted-foreground/60 rounded-2xl"
                  data-testid="input-message"
                />
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-3 bottom-3"
                >
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="p-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                    data-testid="button-send-message"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-muted-foreground/80 mt-3 text-center font-medium"
            >
              Press <kbd className="px-2 py-1 bg-muted/60 rounded text-xs">Enter</kbd> to send • <kbd className="px-2 py-1 bg-muted/60 rounded text-xs">Shift+Enter</kbd> for new line
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
