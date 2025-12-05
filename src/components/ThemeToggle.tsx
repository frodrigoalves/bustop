import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = root.classList.contains("dark") ? "dark" : "light";
    // Default to dark mode if no class is set
    if (!root.classList.contains("dark") && !root.classList.contains("light")) {
      root.classList.add("dark");
      setTheme("dark");
    } else {
      setTheme(initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    const newTheme = theme === "light" ? "dark" : "light";
    
    root.classList.remove(theme);
    root.classList.add(newTheme);
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 group"
      aria-label="Alternar tema"
    >
      <div className="relative w-3.5 h-3.5">
        <Sun className={`absolute inset-0 h-3.5 w-3.5 text-muted-foreground transition-all duration-300 ${
          theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
        }`} strokeWidth={1.5} />
        <Moon className={`absolute inset-0 h-3.5 w-3.5 text-muted-foreground transition-all duration-300 ${
          theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
        }`} strokeWidth={1.5} />
      </div>
    </button>
  );
};