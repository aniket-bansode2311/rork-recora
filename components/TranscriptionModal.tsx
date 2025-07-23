import React, { useState } from "react";
import { StyleSheet, Text, View, Modal, Pressable, ScrollView } from "react-native";
import { X, Copy, Users, FileText } from "lucide-react-native";
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
  const [viewMode, setViewMode] = useState<'full' | 'speakers'>('full');

  const copyToClipboard = async () => {
    if (recording?.transcription) {
      await Clipboard.setStringAsync(recording.transcription);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string) => {
    const colors_list = [
      '#7C3AED', '#059669', '#DC2626', '#D97706', '#2563EB', '#7C2D12'
    ];
    const index = speaker.charCodeAt(speaker.length - 1) % colors_list.length;
    return colors_list[index];
  };

  if (!recording) return null;

  const hasSpeakers = recording.speakerSegments && recording.speakerSegments.length > 0;

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
            {hasSpeakers && (
              <Text style={[styles.speakerCount, { color: colors.purple.primary }]}>
                {recording.speakers?.length || 0} speakers identified
              </Text>
            )}
          </View>

          {hasSpeakers && (
            <View style={styles.viewModeContainer}>
              <Pressable
                onPress={() => setViewMode('full')}
                style={({ pressed }) => [
                  styles.viewModeButton,
                  { 
                    backgroundColor: viewMode === 'full' ? colors.purple.primary : colors.lightGray,
                    borderColor: colors.mediumGray 
                  },
                  pressed && styles.pressed
                ]}
              >
                <FileText size={16} color={viewMode === 'full' ? '#fff' : colors.text} />
                <Text style={[
                  styles.viewModeText, 
                  { color: viewMode === 'full' ? '#fff' : colors.text }
                ]}>
                  Full Text
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setViewMode('speakers')}
                style={({ pressed }) => [
                  styles.viewModeButton,
                  { 
                    backgroundColor: viewMode === 'speakers' ? colors.purple.primary : colors.lightGray,
                    borderColor: colors.mediumGray 
                  },
                  pressed && styles.pressed
                ]}
              >
                <Users size={16} color={viewMode === 'speakers' ? '#fff' : colors.text} />
                <Text style={[
                  styles.viewModeText, 
                  { color: viewMode === 'speakers' ? '#fff' : colors.text }
                ]}>
                  By Speaker
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.transcriptionContainer}>
            <View style={styles.transcriptionHeader}>
              <Text style={[styles.transcriptionLabel, { color: colors.text }]}>
                {viewMode === 'speakers' ? 'Speaker Transcription' : 'Transcription'}
              </Text>
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
              {viewMode === 'speakers' && hasSpeakers ? (
                <View style={styles.speakerTranscription}>
                  {recording.speakerSegments?.map((segment, index) => (
                    <View key={index} style={styles.speakerSegment}>
                      <View style={styles.speakerHeader}>
                        <View style={[
                          styles.speakerDot, 
                          { backgroundColor: getSpeakerColor(segment.speaker) }
                        ]} />
                        <Text style={[styles.speakerName, { color: colors.text }]}>
                          {segment.speaker}
                        </Text>
                        <Text style={[styles.timestamp, { color: colors.darkGray }]}>
                          {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                        </Text>
                      </View>
                      <Text style={[styles.speakerText, { color: colors.text }]}>
                        {segment.text}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.transcriptionText, { color: colors.text }]}>
                  {recording.transcription || "No transcription available"}
                </Text>
              )}
            </View>
          </View>

          {hasSpeakers && (
            <View style={[styles.speakerSummary, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Speaker Summary</Text>
              {recording.speakers?.map((speaker, index) => (
                <View key={speaker} style={styles.speakerSummaryItem}>
                  <View style={[
                    styles.speakerDot, 
                    { backgroundColor: getSpeakerColor(speaker) }
                  ]} />
                  <Text style={[styles.speakerSummaryText, { color: colors.text }]}>
                    {speaker}: {recording.speakerSegments?.filter(s => s.speaker === speaker).length || 0} segments
                  </Text>
                </View>
              ))}
            </View>
          )}
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
    marginBottom: 20,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  recordingDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  speakerCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewModeContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
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
  speakerTranscription: {
    gap: 16,
  },
  speakerSegment: {
    marginBottom: 16,
  },
  speakerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  speakerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  speakerName: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: "auto",
  },
  speakerText: {
    fontSize: 16,
    lineHeight: 22,
    marginLeft: 20,
  },
  speakerSummary: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  speakerSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  speakerSummaryText: {
    fontSize: 14,
  },
});