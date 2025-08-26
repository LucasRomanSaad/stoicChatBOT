import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const conversationId = id ? parseInt(id) : null;
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);

  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: authService.getCurrentUser,
  });

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations", {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
      });
      return response.json();
    },
    enabled: !!user,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  useEffect(() => {
    setIsSidebarCollapsed(isMobile);
  }, [isMobile]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (user === null) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // Auto-create conversation if none exists and user is authenticated
  useEffect(() => {
    if (user && !conversationId && conversations !== undefined) {
      if (conversations.length === 0) {
        // No conversations exist, create one
        createConversationMutation.mutate();
      } else {
        // Redirect to the most recent conversation
        const mostRecent = conversations[0];
        setLocation(`/chat/${mostRecent.id}`);
      }
    }
  }, [user, conversationId, conversations, createConversationMutation, setLocation]);

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your conversation...</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleDeleteConversation = () => {
    setLocation("/chat");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen bg-background">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden"
          data-testid="button-toggle-sidebar"
        >
          {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </Button>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar - Always Fixed */}
      <Sidebar
        currentConversationId={conversationId}
        isCollapsed={isMobile ? isSidebarCollapsed : (!isMobile && isSidebarCollapsed)}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Chat Area with proper margin */}
      <div className={`h-full flex flex-col transition-all duration-300 ${
        isMobile ? 'ml-0' : (isSidebarCollapsed ? 'ml-16' : 'ml-80')
      }`}>
        <ChatInterface
          conversationId={conversationId}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
    </div>
  );
}
