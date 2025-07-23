const primaryColor = "#7C3AED";
const secondaryColor = "#A855F7";
const accentColor = "#C084FC";

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
    
    // Rev-inspired colors
    purple: {
      primary: "#7C3AED",
      secondary: "#A855F7",
      light: "#C084FC",
      dark: "#5B21B6",
    },
    gradients: {
      purple: ["#7C3AED", "#A855F7", "#C084FC"] as const,
      purpleDark: ["#5B21B6", "#7C3AED"] as const,
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
    
    // Rev-inspired colors
    purple: {
      primary: "#7C3AED",
      secondary: "#A855F7",
      light: "#C084FC",
      dark: "#5B21B6",
    },
    gradients: {
      purple: ["#7C3AED", "#A855F7", "#C084FC"] as const,
      purpleDark: ["#5B21B6", "#7C3AED"] as const,
    }
  },
};