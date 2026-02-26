import {
  createContext,
  useState,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  token: string | null;
  username: string | null;
  loading: boolean;
  login: (newToken: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Extract username from token (token format: "token_bryce")
  const username = token?.split("_")?.[1] ?? null;

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken || null);
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    navigate("/");
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
