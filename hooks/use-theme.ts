import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const THEME_STORAGE_KEY = "app_theme";

type Theme = "light" | "dark";

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [theme, setTheme] = useState<Theme>("light");

  const themeQuery = useQuery({
    queryKey: ["theme"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        return (stored as Theme) || "light";
      } catch (error) {
        console.error("Error loading theme:", error);
        return "light";
      }
    },
  });

  const themeMutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      return newTheme;
    },
  });

  useEffect(() => {
    if (themeQuery.data) {
      setTheme(themeQuery.data);
    }
  }, [themeQuery.data]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    themeMutation.mutate(newTheme);
  };

  const colors = Colors[theme];

  return { 
    theme, 
    colors, 
    toggleTheme,
    isLoading: themeQuery.isLoading 
  };
});