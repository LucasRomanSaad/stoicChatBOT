import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { conversationService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Plus, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: conversationService.getConversations,
  });

  const handleCreateConversation = async () => {
    try {
      const newConversation = await conversationService.createConversation();
      setLocation(`/chat/${newConversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleOpenConversation = (id: number) => {
    setLocation(`/chat/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <ScrollText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Personal Stoic Guide
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Welcome back. Continue your philosophical journey or start a new conversation.
          </p>
        </motion.div>

        {/* New Conversation Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md mx-auto mb-8"
        >
          <Button
            onClick={handleCreateConversation}
            className="w-full h-12 text-lg"
            data-testid="button-new-conversation"
          >
            <Plus className="w-5 h-5 mr-2" />
            Start New Conversation
          </Button>
        </motion.div>

        {/* Conversations List */}
        <div className="max-w-4xl mx-auto">
          {conversations && conversations.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-6">Recent Conversations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {conversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                      onClick={() => handleOpenConversation(conversation.id)}
                      data-testid={`card-conversation-${conversation.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base line-clamp-2" data-testid={`text-conversation-title-${conversation.id}`}>
                              {conversation.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your first conversation to explore Stoic wisdom.
              </p>
              <Button onClick={handleCreateConversation} data-testid="button-first-conversation">
                <Plus className="w-4 h-4 mr-2" />
                Start First Conversation
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
