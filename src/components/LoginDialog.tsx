import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const LoginDialog = ({ open, onOpenChange, onSuccess }: LoginDialogProps) => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Credenciais fixas para acesso ao dashboard
    if (credentials.username === "gestor" && credentials.password === "topbus2024") {
      toast.success("Acesso autorizado");
      onSuccess();
      onOpenChange(false);
      setCredentials({ username: "", password: "" });
    } else {
      toast.error("Credenciais inválidas");
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Lock className="h-4 w-4" strokeWidth={1.5} />
            Acesso Restrito
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">Usuário</Label>
            <Input
              id="username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Digite seu usuário"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Digite sua senha"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl" 
            disabled={loading}
          >
            {loading ? "Verificando..." : "Acessar Dashboard"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};