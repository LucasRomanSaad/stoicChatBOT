
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { conversationService } from "@/lib/api";
import { authService } from "@/lib/auth";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, Plus, Settings, Moon, Sun, LogOut, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { MeResponse } from "@/lib/auth";

interface SidebarProps {
  currentConversationId?: string | number | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentConversationId, isCollapsed }: SidebarProps) {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: conversationService.getConversations,
    refetchInterval: 2000, 
  });

  const { data: meData } = useQuery({
    queryKey: ["/api/me"],
    queryFn: authService.getCurrentUser,
  });
  
  const user = meData?.user;
  const isGuest = meData?.isGuest || false;

  const createConversationMutation = useMutation({
    mutationFn: conversationService.createConversation,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  const handleCreateConversation = () => {
    createConversationMutation.mutate("");
  };

  const handleSignOut = () => {
    authService.logout();
    setLocation("/auth");
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 320 }}
        animate={{ width: 64 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-30"
      >
        <div className="p-4 border-b border-border">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateConversation}
            disabled={createConversationMutation.isPending}
            className="w-full p-2 justify-center"
            data-testid="button-new-conversation-collapsed"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-2 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full p-2 justify-center"
            data-testid="button-theme-toggle-collapsed"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="w-full p-2 justify-center"
            data-testid="button-settings-collapsed"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ width: 64 }}
        animate={{ width: 320 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 h-screen bg-card border-r  border-blue-500 flex flex-col z-30"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-500 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-semibold text-primary">Stoic Guide</h1>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="p-2"
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleCreateConversation}
            disabled={createConversationMutation.isPending}
            data-testid="button-new-conversation"
            className="
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 transform
                shadow-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                motion-reduce:transition-none motion-reduce:transform-none

                w-full mx-2
                bg-white text-gray-800 border border-gray-200
                hover:bg-blue-500 hover:text-white hover:border-blue-400 hover:shadow-md hover:scale-105

                dark:bg-gray-800 dark:text-white/80 dark:border-primary/20
                dark:hover:bg-blue-600 dark:hover:text-white dark:hover:border-primary/30
              "
            
          >
            
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>

        {/* Conversations List with Scroll Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 pb-2 flex-shrink-0">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recent Conversations
            </h2>
          </div>
          
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 pb-4">
              <AnimatePresence>
                {conversations?.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      currentConversationId?.toString() === conversation.id.toString()
                        ? "bg-primary/15 border-2 border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => setLocation(`/chat/${conversation.id}`)}
                    data-testid={`conversation-item-${conversation.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          <motion.h5 
                            key={conversation.title}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                            className={`font-medium mb-1 ${
                              currentConversationId?.toString() === conversation.id.toString() ? "text-primary font-semibold" : ""
                            }`} 
                            data-testid={`conversation-title-${conversation.id}`}
                          >
                            {conversation.title}
                          </motion.h5>
                        </AnimatePresence>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* User Profile - Fixed at Bottom */}
        <div className="p-4 border-t border-gray-500 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium" data-testid="user-initials">
                {user?.email ? getUserInitials(user.email) : "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="user-email">
                {isGuest ? "Guest User" : (user?.email || "Loading...")}
              </p>
              {isGuest && (
                <p className="text-xs text-muted-foreground">Limited session</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="p-1.5"
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </motion.div>

      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings}
        user={user}
        isGuest={isGuest}
        onSignOut={handleSignOut}
      />
    </>
  );
}
