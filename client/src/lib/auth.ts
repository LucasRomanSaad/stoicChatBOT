import { LoginData, RegisterData } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GuestSessionResponse {
  sessionId: string;
  message: string;
}

export interface MeResponse {
  user: User | null;
  isGuest: boolean;
  sessionId?: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", data);
    const result = await response.json();
    localStorage.setItem("auth_token", result.token);
    localStorage.removeItem("guest_mode"); 
    return result;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", data);
    const result = await response.json();
    localStorage.setItem("auth_token", result.token);
    localStorage.removeItem("guest_mode"); 
    return result;
  },

  async startGuestSession(): Promise<GuestSessionResponse> {
    const response = await apiRequest("POST", "/api/auth/guest", {});
    const result = await response.json();
    localStorage.setItem("guest_mode", "true");
    localStorage.removeItem("auth_token"); 
    return result;
  },

  async getCurrentUser(): Promise<MeResponse | null> {
    try {
      const response = await apiRequest("GET", "/api/me");
      const result = await response.json();
      return result;
    } catch (error) {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("guest_mode");
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isGuest(): boolean {
    return localStorage.getItem("guest_mode") === "true";
  },

  isLoggedInOrGuest(): boolean {
    return this.isAuthenticated() || this.isGuest();
  },

  hasAuthState(): boolean {
    return this.isAuthenticated() || this.isGuest();
  }
};
