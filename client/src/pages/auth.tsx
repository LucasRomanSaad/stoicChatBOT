import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoginData, RegisterData, loginSchema, registerSchema } from "@shared/schema";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ScrollText } from "lucide-react";

// Enhanced Background animation components
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 -z-10">
      {/* Animated geometric shapes with more visibility */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute border border-blue-500/30 rounded-lg"
          initial={{
            scale: 0,
            rotate: Math.random() * 180 - 90,
            opacity: 0,
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, 0.8, 0.5],
            rotate: [Math.random() * 180 - 90, Math.random() * 360 - 180],
            opacity: [0, 0.3, 0.2],
            x: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
            y: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
          }}
          transition={{
            duration: 15 + Math.random() * 15,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            width: `${40 + Math.random() * 120}px`,
            height: `${40 + Math.random() * 120}px`,
          }}
        />
      ))}

      {/* More visible flowing lines */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
          initial={{
            opacity: 0,
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            rotate: Math.random() * 180,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            x: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
            y: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
          }}
          transition={{
            duration: 12 + Math.random() * 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: `${150 + Math.random() * 250}px`,
          }}
        />
      ))}

      {/* More visible pulsing dots */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute rounded-full bg-blue-500/30"
          initial={{
            scale: 0,
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, Math.random() * 1.2, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: `${4 + Math.random() * 10}px`,
            height: `${4 + Math.random() * 10}px`,
          }}
        />
      ))}

      {/* Pulsing radial gradient */}
      <motion.div 
        className="absolute inset-0 bg-radial-gradient from-transparent to-blue-900/20"
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Subtle grid pattern for depth */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
    </div>
  );
};

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials.",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      toast({
        title: "Account created!",
        description: "Welcome to your Personal Stoic Guide.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Please try again.",
      });
    },
  });

  const guestMutation = useMutation({
    mutationFn: authService.startGuestSession,
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "You're now using Personal Stoic Guide as a guest.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to start guest session",
        description: error.message || "Please try again.",
      });
    },
  });

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  const onGuestMode = () => {
    guestMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border border-gray-700 bg-gray-900/90 backdrop-blur-md shadow-2xl text-gray-100">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4"
            >
              <ScrollText className="w-8 h-8 text-blue-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-blue-400">
              Personal Stoic Guide
            </CardTitle>
            <p className="text-gray-400 mt-2">
              Begin your journey in ancient wisdom
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger 
                  value="login" 
                  data-testid="tab-login"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  data-testid="tab-register"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      data-testid="input-login-email"
                      {...loginForm.register("email")}
                      className="mt-1 bg-gray-800 border-gray-700 text-white focus:ring-blue-500"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-400 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-login-password"
                      {...loginForm.register("password")}
                      className="mt-1 bg-gray-800 border-gray-700 text-white focus:ring-blue-500"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-400 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div>
                    <Label htmlFor="register-email" className="text-gray-300">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      data-testid="input-register-email"
                      {...registerForm.register("email")}
                      className="mt-1 bg-gray-800 border-gray-700 text-white focus:ring-blue-500"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-400 mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-password" className="text-gray-300">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-register-password"
                      {...registerForm.register("password")}
                      className="mt-1 bg-gray-800 border-gray-700 text-white focus:ring-blue-500"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-400 mt-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Guest Mode Section */}
            <div className="mt-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900/90 px-2 text-gray-500">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onGuestMode}
                disabled={guestMutation.isPending}
                className="w-full mt-4 border-gray-700 text-gray-300 hover:bg-gray-800"
                data-testid="button-guest-mode"
              >
                {guestMutation.isPending ? "Starting session..." : "Continue as Guest"}
              </Button>

              <p className="text-xs text-gray-500 mt-2">
                Try the app without creating an account. Your conversations will be temporary.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add CSS for the grid pattern */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}