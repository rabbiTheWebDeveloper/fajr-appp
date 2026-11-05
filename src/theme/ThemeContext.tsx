import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { darkPalette, lightPalette, type Palette } from "@/theme/palette";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeValue {
  /** The colours for the theme in force */
  c: Palette;
  isDark: boolean;
  /** What the person chose: light, dark, or follow the phone */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "fajr.theme";

const ThemeContext = createContext<ThemeValue>({
  c: lightPalette,
  isDark: false,
  mode: "system",
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";

  const value = useMemo<ThemeValue>(() => ({ c: isDark ? darkPalette : lightPalette, isDark, mode, setMode }), [isDark, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Styles that depend on the theme:
 *
 *   const makeStyles = (c: Palette) => StyleSheet.create({ box: { backgroundColor: c.surface } });
 *   const s = useStyles(makeStyles);
 *
 * Declare makeStyles outside the component so the styles are only rebuilt when the theme changes.
 */
export function useStyles<T>(factory: (c: Palette, isDark: boolean) => T): T {
  const { c, isDark } = useTheme();
  return useMemo(() => factory(c, isDark), [factory, c, isDark]);
}
