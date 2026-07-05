import * as React from "react";

type Theme = "light" | "dark" | "system";
type ThemeState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
};

const ThemeContext = React.createContext<ThemeState | null>(null);

const STORAGE_KEY = "poap-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const v = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return v ?? "system";
  });

  const [resolved, setResolved] = React.useState<"light" | "dark">(() => applyTheme(theme));

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    setResolved(applyTheme(theme));
  }, [theme]);

  React.useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
