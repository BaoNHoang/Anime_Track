import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { ThemeContext, type AnimeTheme, type ColorScheme, type Theme } from "./themeContext";

const THEME_KEY = "banime:theme";
const COLOR_SCHEME_KEY = "banime:color-scheme";
const ANIME_THEME_KEY = "banime:anime-theme";

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

function getInitialAnimeTheme(): AnimeTheme {
  const saved = savedPreference(ANIME_THEME_KEY);
  return saved === "aot" || saved === "one-piece" || saved === "demon-slayer"
    ? saved : "seasonal";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme);
  const [animeTheme, setAnimeThemeState] = useState<AnimeTheme>(getInitialAnimeTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorScheme = colorScheme;
    document.documentElement.dataset.animeTheme = animeTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      getComputedStyle(document.documentElement).getPropertyValue("--chrome").trim()
    );
    try {
      window.localStorage.setItem(THEME_KEY, theme);
      window.localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
      window.localStorage.setItem(ANIME_THEME_KEY, animeTheme);
    } catch {
      // The selection still works for this session if storage is unavailable.
    }
  }, [theme, colorScheme, animeTheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const setColorScheme = useCallback((nextColorScheme: ColorScheme) => {
    setColorSchemeState(nextColorScheme);
  }, []);

  const setAnimeTheme = useCallback((nextAnimeTheme: AnimeTheme) => {
    setAnimeThemeState(nextAnimeTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, colorScheme, animeTheme, setTheme, setColorScheme, setAnimeTheme, toggleTheme }),
    [animeTheme, colorScheme, setAnimeTheme, setColorScheme, setTheme, theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
