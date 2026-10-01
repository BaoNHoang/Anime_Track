import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { ThemeContext, type ColorScheme, type Theme } from "./themeContext";

const THEME_KEY = "banime:theme";
const COLOR_SCHEME_KEY = "banime:color-scheme";

function savedPreference(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getInitialTheme(): Theme {
  const saved = savedPreference(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialColorScheme(): ColorScheme {
  const saved = savedPreference(COLOR_SCHEME_KEY);
  return saved === "ocean" || saved === "wisteria" ? saved : "sakura";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorScheme = colorScheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      getComputedStyle(document.documentElement).getPropertyValue("--chrome").trim()
    );
    try {
      window.localStorage.setItem(THEME_KEY, theme);
      window.localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
    } catch {
      // The selection still works for this session if storage is unavailable.
    }
  }, [theme, colorScheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const setColorScheme = useCallback((nextColorScheme: ColorScheme) => {
    setColorSchemeState(nextColorScheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, colorScheme, setTheme, setColorScheme, toggleTheme }),
    [colorScheme, setColorScheme, setTheme, theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
