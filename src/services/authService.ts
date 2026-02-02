/**
 * Authentication service for managing user sessions
 */

import { Platform, AsyncStorage } from "react-native";
import { researchService } from "./researchService";

const TOKEN_KEY = "@uffp_auth_token";
const USER_KEY = "@uffp_user";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  stats?: {
    forecastCount: number;
    avgBrierScore: number | null;
    resolvedCount: number;
    calibrationScore: number | null;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  // Load auth state from storage
  private async loadFromStorage() {
    try {
      const [storedToken, storedUser] =
        Platform.OS === "web"
          ? [localStorage.getItem(TOKEN_KEY), localStorage.getItem(USER_KEY)]
          : await Promise.all([
              AsyncStorage.getItem(TOKEN_KEY),
              AsyncStorage.getItem(USER_KEY),
            ]);

      if (storedToken && storedUser) {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);

        // Verify token is still valid
        try {
          const result = await researchService.getCurrentUser(storedToken);
          if (result.success && result.user) {
            this.user = result.user;
            await this.saveToStorage(storedToken, result.user);
            this.notifyListeners();
          } else {
            // Token expired or invalid
            await this.logout();
          }
        } catch (error) {
          // Network error or invalid token
          console.error("[Auth] Failed to verify token:", error);
          // Keep local token for offline mode
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error("[Auth] Failed to load from storage:", error);
    }
  }

  // Save auth state to storage
  private async saveToStorage(token: string, user: User) {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } catch (error) {
      console.error("[Auth] Failed to save to storage:", error);
    }
  }

  // Clear auth state from storage
  private async clearStorage() {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch (error) {
      console.error("[Auth] Failed to clear storage:", error);
    }
  }

  // Register new user
  async register(email: string, password: string, name?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await researchService.register(email, password, name);

      if (result.success && result.user && result.token) {
        this.token = result.token;
        this.user = result.user;
        await this.saveToStorage(result.token, result.user);
        this.notifyListeners();
        return { success: true };
      }

      return { success: false, error: result.error || "Registration failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  }

  // Login existing user
  async login(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await researchService.login(email, password);

      if (result.success && result.user && result.token) {
        this.token = result.token;
        this.user = result.user;
        await this.saveToStorage(result.token, result.user);
        this.notifyListeners();
        return { success: true };
      }

      return { success: false, error: result.error || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  }

  // Logout
  async logout() {
    this.token = null;
    this.user = null;
    await this.clearStorage();
    this.notifyListeners();
  }

  // Get current auth state
  getState(): AuthState {
    return {
      user: this.user,
      token: this.token,
      isAuthenticated: this.token !== null && this.user !== null,
      isLoading: false,
    };
  }

  // Get current user
  getUser(): User | null {
    return this.user;
  }

  // Get auth token
  getToken(): string | null {
    return this.token;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners of state change
  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Refresh user data
  async refreshUser(): Promise<void> {
    if (!this.token) return;

    try {
      const result = await researchService.getCurrentUser(this.token);
      if (result.success && result.user) {
        this.user = result.user;
        await this.saveToStorage(this.token, result.user);
        this.notifyListeners();
      }
    } catch (error) {
      console.error("[Auth] Failed to refresh user:", error);
    }
  }
}

export const authService = new AuthService();
