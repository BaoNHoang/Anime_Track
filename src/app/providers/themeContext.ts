import { createContext } from "react";

export type Theme = "light" | "dark";
export type ColorScheme = "sakura" | "ocean" | "wisteria";
export type AnimeTheme = "seasonal" | "aot" | "one-piece" | "demon-slayer" | "mushoku-tensei";

export interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  animeTheme: AnimeTheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  setAnimeTheme: (animeTheme: AnimeTheme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);
