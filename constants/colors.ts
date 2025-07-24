const primaryColor = "#6366F1";
const secondaryColor = "#8B5CF6";
const accentColor = "#A78BFA";

export default {
  light: {
    text: "#000",
    background: "#fff",
    tint: primaryColor,
    tabIconDefault: "#ccc",
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
    lightGray: "#f5f5f5",
    mediumGray: "#e0e0e0",
    darkGray: "#9e9e9e",
    danger: "#ff4757",
    success: "#2ed573",
    recording: "#ff6584",
    recordingBackground: "rgba(255, 101, 132, 0.1)",
    
    // Modern purple palette
    purple: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      light: "#A78BFA",
      dark: "#4F46E5",
    },
    blue: {
      primary: "#2563EB",
      secondary: "#3B82F6",
      light: "#60A5FA",
      dark: "#1D4ED8",
    },
    gradients: {
      purple: ["#6366F1", "#8B5CF6", "#A78BFA"] as const,
      purpleDark: ["#4F46E5", "#6366F1"] as const,
    }
  },
  dark: {
    text: "#fff",
    background: "#1a1a1a",
    tint: primaryColor,
    tabIconDefault: "#666",
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
    lightGray: "#2a2a2a",
    mediumGray: "#404040",
    darkGray: "#888",
    danger: "#ff4757",
    success: "#2ed573",
    recording: "#ff6584",
    recordingBackground: "rgba(255, 101, 132, 0.1)",
    
    // Modern purple palette
    purple: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      light: "#A78BFA",
      dark: "#4F46E5",
    },
    blue: {
      primary: "#2563EB",
      secondary: "#3B82F6",
      light: "#60A5FA",
      dark: "#1D4ED8",
    },
    gradients: {
      purple: ["#6366F1", "#8B5CF6", "#A78BFA"] as const,
      purpleDark: ["#4F46E5", "#6366F1"] as const,
    }
  },
};