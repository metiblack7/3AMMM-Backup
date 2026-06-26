import { useApp } from "./AppContext";

export const useTheme = () => {
  const { C, theme } = useApp();
  return { C, isDark: theme === "dark" };
};