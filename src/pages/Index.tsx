import { useState } from "react";
import { IncidentForm } from "@/components/IncidentForm";
import { LoginDialog } from "@/components/LoginDialog";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const Index = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (isAuthenticated) {
    return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with discrete login button */}
      <div className="fixed top-4 left-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowLogin(true)} 
          className="opacity-40 hover:opacity-100 transition-all duration-300 h-7 w-7 rounded-full border border-border/50 bg-white/50 backdrop-blur-sm hover:bg-accent/50"
        >
          <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Main form */}
      <div className="px-4 sm:px-6 md:px-8 py-16 md:py-12 max-w-2xl mx-auto">
        <IncidentForm />
      </div>

      {/* Login dialog */}
      <LoginDialog 
        open={showLogin} 
        onOpenChange={setShowLogin} 
        onSuccess={() => setIsAuthenticated(true)} 
      />

      {/* Footer credit */}
      <a 
        href="https://rodrigo.run" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-xs text-muted-foreground opacity-40 hover:opacity-100 transition-opacity duration-300"
      >
        DEV - rodrigo.run
      </a>
    </div>
  );
};

export default Index;