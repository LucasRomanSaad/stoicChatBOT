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

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", data);
    const result = await response.json();
    localStorage.setItem("auth_token", result.token);
    return result;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", data);
    const result = await response.json();
    localStorage.setItem("auth_token", result.token);
    return result;
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiRequest("GET", "/api/me");
      const result = await response.json();
      return result.user;
    } catch (error) {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("auth_token");
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};
