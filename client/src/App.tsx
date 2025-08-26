import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import NotFound from "@/pages/not-found";
import Auth from "@/pages/auth";

import Chat from "@/pages/chat";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

function AuthenticatedApp() {
  const [location, setLocation] = useLocation();

  const { data: meData, isLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: authService.getCurrentUser,
  });

  useEffect(() => {
    // Only run auth logic after data is loaded to prevent infinite loops
    if (isLoading) return;
    
    const hasAuthState = authService.hasAuthState();
    
    // Redirect to auth if no auth state and not already on auth page
    if (!hasAuthState && location !== "/auth") {
      setLocation("/auth");
      return;
    }
    
    // Redirect away from auth if user has auth state
    if (hasAuthState && location === "/auth") {
      setLocation("/chat");
      return;
    }
  }, [isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/chat" component={Chat} />
      <Route path="/" component={() => { setLocation("/chat"); return null; }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;