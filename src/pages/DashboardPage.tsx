import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Navigate } from "react-router-dom";

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
}