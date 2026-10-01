import { createContext } from "react";

export type Theme = "light" | "dark";
export type ColorScheme = "sakura" | "ocean" | "wisteria";

export interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);
