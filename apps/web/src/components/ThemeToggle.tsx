import { useState } from "react";

function current(): string {
  return document.documentElement.getAttribute("data-theme") || "light";
}

export function ThemeToggle({ small }: { small?: boolean }) {
  const [theme, setTheme] = useState(current);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };

  return (
    <button
      className={`theme-btn${small ? " sm" : ""}`}
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === "light" ? "☾" : "☀"}
    </button>
  );
}
