import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Menu, X, Plus, ScrollText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const conversationId = id || null;
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

  useEffect(() => {
    if (user === null) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (user !== null && !conversationId && conversations !== undefined) {
      if (conversations.length > 0) {
        const mostRecent = conversations[0];
        setLocation(`/chat/${mostRecent.id}`);
      }
    }
  }, [user, conversationId, conversations, setLocation]);

  // Show empty state if no conversations exist
  if (user !== null && conversations !== undefined && conversations.length === 0) {
    return (
      <div className="h-screen bg-background">
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

        {isMobile && !isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        <Sidebar
          currentConversationId={null}
          isCollapsed={isMobile ? isSidebarCollapsed : (!isMobile && isSidebarCollapsed)}
          onToggleCollapse={toggleSidebar}
        />

        <div className={`h-full flex flex-col transition-all duration-300 ${
          isMobile ? 'ml-0' : (isSidebarCollapsed ? 'ml-16' : 'ml-80')
        }`}>
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-2xl">
                  <ScrollText className="w-10 h-10 text-primary" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                No Conversations Yet
              </h3>
              
              <p className="text-muted-foreground mb-8 leading-relaxed">
                There aren't any conversations created. Create one by clicking the following button to start your journey with Stoic wisdom.
              </p>
              
              <Button
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                className="px-6 py-3 text-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-200"
                data-testid="button-create-first-conversation"
              >
                {createConversationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Conversation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <Sidebar
        currentConversationId={conversationId}
        isCollapsed={isMobile ? isSidebarCollapsed : (!isMobile && isSidebarCollapsed)}
        onToggleCollapse={toggleSidebar}
      />

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
