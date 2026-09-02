import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/Services/api";

interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  isAdmin: boolean;
  isOwner: boolean;
  anyAdminExists: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  claimFirstOwner: () => Promise<{ granted: boolean; reason?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => { },
  refreshUser: async () => { },
  claimFirstOwner: async () => ({ granted: false }),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await api.get("/Auth/Me");
      setUser(response.data);
    } catch (error: any) {
      setUser(null);
      throw error;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();
      }
      catch (error) {
        console.error("Failed to refresh user:", error);
      }
      finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const signOut = async () => {
    await api.post("/Auth/Logout");

    setUser(null);
  };

  const claimFirstOwner = async (): Promise<{
    granted: boolean;
    reason?: string;
  }> => {
    const { data } = await api.post("/Auth/ClaimFirstAdmin");

    return {
      granted: Boolean(data?.granted),
      reason: data?.reason,
    };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, claimFirstOwner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
