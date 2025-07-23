import React from "react";
import { StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { Upload } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";

interface UploadButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export default function UploadButton({ onPress, loading = false }: UploadButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.purple.primary },
        pressed && styles.pressed,
        loading && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={styles.icon} />
      ) : (
        <Upload size={20} color="#fff" style={styles.icon} />
      )}
      <Text style={styles.text}>
        {loading ? "Uploading..." : "Upload Audio"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});