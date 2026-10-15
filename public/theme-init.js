(() => {
  let saved;
  let colorScheme;
  let animeTheme;
  try {
    saved = localStorage.getItem("banime:theme");
    colorScheme = localStorage.getItem("banime:color-scheme");
    animeTheme = localStorage.getItem("banime:anime-theme");
  } catch {
    // Keep system brightness and the default palette when storage is unavailable.
  }
  const theme =
    saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.colorScheme =
    colorScheme === "ocean" || colorScheme === "wisteria" ? colorScheme : "sakura";
  document.documentElement.dataset.animeTheme =
    animeTheme === "aot" || animeTheme === "one-piece" || animeTheme === "demon-slayer"
      ? animeTheme : "seasonal";
})();
