import React from "react";
import { StyleSheet, Text, View, Modal, Pressable, ScrollView } from "react-native";
import { X, Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/hooks/use-theme";
import { Recording } from "@/types/recording";

interface TranscriptionModalProps {
  visible: boolean;
  recording: Recording | null;
  onClose: () => void;
}

export default function TranscriptionModal({ visible, recording, onClose }: TranscriptionModalProps) {
  const { colors } = useTheme();

  const copyToClipboard = async () => {
    if (recording?.transcription) {
      await Clipboard.setStringAsync(recording.transcription);
    }
  };

  if (!recording) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.mediumGray }]}>
          <Text style={[styles.title, { color: colors.text }]}>Transcription</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.recordingInfo, { backgroundColor: colors.lightGray }]}>
            <Text style={[styles.recordingTitle, { color: colors.text }]}>{recording.title}</Text>
            <Text style={[styles.recordingDate, { color: colors.darkGray }]}>
              {new Date(recording.createdAt).toLocaleDateString()} • {new Date(recording.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.transcriptionContainer}>
            <View style={styles.transcriptionHeader}>
              <Text style={[styles.transcriptionLabel, { color: colors.text }]}>Transcription</Text>
              {recording.transcription && (
                <Pressable
                  onPress={copyToClipboard}
                  style={({ pressed }) => [
                    styles.copyButton,
                    { backgroundColor: colors.purple.primary },
                    pressed && styles.pressed
                  ]}
                >
                  <Copy size={16} color="#fff" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.transcriptionBox, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.transcriptionText, { color: colors.text }]}>
                {recording.transcription || "No transcription available"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recordingInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  recordingDate: {
    fontSize: 14,
  },
  transcriptionContainer: {
    flex: 1,
  },
  transcriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  transcriptionLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  transcriptionBox: {
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
});