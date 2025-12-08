import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading, userRole, signOut } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole !== null && userRole !== "admin" && userRole !== "analyst") {
        navigate("/auth");
      }
    }
  }, [user, loading, userRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || (userRole !== "admin" && userRole !== "analyst")) {
    return null;
  }

  return <Dashboard onLogout={signOut} />;
}