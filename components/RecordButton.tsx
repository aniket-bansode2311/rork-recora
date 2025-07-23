import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { Mic, Square } from "lucide-react-native";

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
}

export default function RecordButton({ isRecording, onPress }: RecordButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isRecording && styles.recordingContainer,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.iconContainer}>
        {isRecording ? (
          <Square size={24} color="#fff" fill="#fff" />
        ) : (
          <Mic size={24} color="#fff" />
        )}
      </View>
      <Text style={styles.buttonText}>
        {isRecording ? "Stop" : "Record"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    minWidth: 120,
  },
  recordingContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});