import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const conversationId = parseInt(id || "0");
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);

  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: authService.getCurrentUser,
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

  if (!conversationId || isNaN(conversationId)) {
    setLocation("/");
    return null;
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
    setLocation("/");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen bg-background flex">
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

      {/* Sidebar */}
      <div className={`${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'} ${isMobile && isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'} transition-transform duration-300`}>
        <Sidebar
          currentConversationId={conversationId}
          isCollapsed={!isMobile && isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          conversationId={conversationId}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
    </div>
  );
}
