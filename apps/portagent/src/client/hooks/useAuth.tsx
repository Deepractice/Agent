import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userId: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "portagent_token";
const USER_ID_KEY = "portagent_user_id";

/**
 * Auth API client
 */
async function loginApi(password: string): Promise<{ token: string; userId: string } | null> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { token: data.token, userId: data.userId };
  } catch {
    return null;
  }
}

async function verifyApi(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Auth Provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUserId = localStorage.getItem(USER_ID_KEY);

    if (storedToken) {
      // Verify token is still valid
      verifyApi(storedToken).then((valid) => {
        if (valid) {
          setToken(storedToken);
          setUserId(storedUserId);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_ID_KEY);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const result = await loginApi(password);

    if (result) {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_ID_KEY, result.userId);
      setToken(result.token);
      setUserId(result.userId);
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setToken(null);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        userId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Get auth token for API calls
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
