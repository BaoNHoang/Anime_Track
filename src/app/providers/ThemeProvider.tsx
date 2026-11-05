import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { ThemeContext, type AnimeTheme, type ColorScheme, type Theme } from "./themeContext";
import { getHolidaySeason, millisecondsUntilNextLocalDay } from "../../domain/appearance/holidaySeason";

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
  return saved === "aot" || saved === "one-piece" || saved === "demon-slayer" || saved === "mushoku-tensei"
    ? saved : "seasonal";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme);
  const [animeTheme, setAnimeThemeState] = useState<AnimeTheme>(getInitialAnimeTheme);
  const [holidaySeason, setHolidaySeason] = useState(() => getHolidaySeason(new Date()));

  useEffect(() => {
    let timer: number;
    const refresh = () => {
      window.clearTimeout(timer);
      const now = new Date();
      setHolidaySeason(getHolidaySeason(now));
      timer = window.setTimeout(refresh, millisecondsUntilNextLocalDay(now) + 100);
    };
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorScheme = colorScheme;
    document.documentElement.dataset.animeTheme = animeTheme;
    if (holidaySeason) {
      document.documentElement.dataset.holidaySeason = holidaySeason;
    } else {
      delete document.documentElement.dataset.holidaySeason;
    }
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
  }, [theme, colorScheme, animeTheme, holidaySeason]);

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
    () => ({ theme, colorScheme, animeTheme, holidaySeason, setTheme, setColorScheme, setAnimeTheme, toggleTheme }),
    [animeTheme, colorScheme, holidaySeason, setAnimeTheme, setColorScheme, setTheme, theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
