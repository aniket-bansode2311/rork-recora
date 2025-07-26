import React, { useState } from "react";
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Alert, Platform } from "react-native";
import { X, Copy, Users, FileText, Globe, Languages } from "lucide-react-native";
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
  const [languageMode, setLanguageMode] = useState<'original' | 'translated'>('translated');

  const copyToClipboard = async () => {
    try {
      let textToCopy = '';
      
      if (viewMode === 'speakers' && recording?.speakerSegments) {
        if (languageMode === 'translated' && recording.translatedTranscription) {
          textToCopy = recording.translatedTranscription;
        } else {
          textToCopy = recording.speakerSegments.map(seg => `${seg.speaker}: ${languageMode === 'translated' && seg.translated_text ? seg.translated_text : seg.text}`).join('\n');
        }
      } else {
        textToCopy = languageMode === 'translated' && recording?.translatedTranscription 
          ? recording.translatedTranscription 
          : recording?.transcription || '';
      }
      
      if (textToCopy.trim()) {
        await Clipboard.setStringAsync(textToCopy);
        // Show success feedback
        if (Platform.OS === 'ios') {
          // On iOS, we can show a brief alert
          setTimeout(() => {
            Alert.alert('Copied!', 'Text copied to clipboard', [], { cancelable: true });
          }, 100);
        } else {
          // On Android, show toast-like alert
          Alert.alert('Copied!', 'Text copied to clipboard');
        }
      } else {
        Alert.alert('Nothing to Copy', 'No transcription text available to copy.');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy text to clipboard.');
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
            {recording.detectedLanguage && (
              <Text style={[styles.languageInfo, { color: colors.blue.primary }]}>
                <Globe size={14} color={colors.blue.primary} /> Detected: {recording.detectedLanguage}
              </Text>
            )}
            {hasSpeakers && (
              <Text style={[styles.speakerCount, { color: colors.purple.primary }]}>
                {recording.speakers?.length || 0} speakers identified
              </Text>
            )}
          </View>

          {/* View Mode Toggle */}
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

          {/* Language Mode Toggle */}
          {(recording?.translatedTranscription || recording?.speakerSegments?.some(seg => seg.translated_text)) && (
            <View style={styles.languageModeContainer}>
              <Pressable
                onPress={() => setLanguageMode('original')}
                style={({ pressed }) => [
                  styles.languageModeButton,
                  { 
                    backgroundColor: languageMode === 'original' ? colors.blue.primary : colors.lightGray,
                    borderColor: colors.mediumGray 
                  },
                  pressed && styles.pressed
                ]}
              >
                <Globe size={16} color={languageMode === 'original' ? '#fff' : colors.text} />
                <Text style={[
                  styles.languageModeText, 
                  { color: languageMode === 'original' ? '#fff' : colors.text }
                ]}>
                  Original
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLanguageMode('translated')}
                style={({ pressed }) => [
                  styles.languageModeButton,
                  { 
                    backgroundColor: languageMode === 'translated' ? colors.blue.primary : colors.lightGray,
                    borderColor: colors.mediumGray 
                  },
                  pressed && styles.pressed
                ]}
              >
                <Languages size={16} color={languageMode === 'translated' ? '#fff' : colors.text} />
                <Text style={[
                  styles.languageModeText, 
                  { color: languageMode === 'translated' ? '#fff' : colors.text }
                ]}>
                  English
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.transcriptionContainer}>
            <View style={styles.transcriptionHeader}>
              <View>
                <Text style={[styles.transcriptionLabel, { color: colors.text }]}>
                  {viewMode === 'speakers' ? 'Speaker Transcription' : 'Transcription'}
                </Text>
                {languageMode === 'translated' && recording?.detectedLanguage && (
                  <Text style={[styles.translationNote, { color: colors.darkGray }]}>
                    Translated from {recording.detectedLanguage}
                  </Text>
                )}
              </View>
              {(recording.transcription || recording.translatedTranscription) && (
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
                  {recording.speakerSegments?.map((segment, index) => {
                    const displayText = languageMode === 'translated' && segment.translated_text 
                      ? segment.translated_text 
                      : segment.text;
                    
                    return (
                      <View key={index} style={styles.speakerSegment}>
                        <View style={styles.speakerHeader}>
                          <View style={[
                            styles.speakerDot, 
                            { backgroundColor: getSpeakerColor(segment.speaker) }
                          ]} />
                          <Text style={[styles.speakerName, { color: colors.text }]}>
                            {segment.speaker}
                          </Text>
                          {segment.language && languageMode === 'original' && (
                            <Text style={[styles.segmentLanguage, { color: colors.blue.primary }]}>
                              {segment.language}
                            </Text>
                          )}
                          <Text style={[styles.timestamp, { color: colors.darkGray }]}>
                            {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                          </Text>
                        </View>
                        <Text style={[styles.speakerText, { color: colors.text }]}>
                          {displayText}
                        </Text>
                        {languageMode === 'translated' && segment.translated_text && segment.text !== segment.translated_text && (
                          <Text style={[styles.originalText, { color: colors.darkGray }]}>
                            Original: {segment.text}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View>
                  <Text style={[styles.transcriptionText, { color: colors.text }]}>
                    {languageMode === 'translated' && recording.translatedTranscription 
                      ? recording.translatedTranscription 
                      : recording.transcription || "No transcription available"}
                  </Text>
                  {languageMode === 'translated' && recording.translatedTranscription && recording.transcription && recording.translatedTranscription !== recording.transcription && (
                    <View style={styles.originalSection}>
                      <Text style={[styles.originalLabel, { color: colors.darkGray }]}>Original:</Text>
                      <Text style={[styles.originalFullText, { color: colors.darkGray }]}>
                        {recording.transcription}
                      </Text>
                    </View>
                  )}
                </View>
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
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recordingInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  languageInfo: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  speakerCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  languageModeContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  languageModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageModeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  translationNote: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentLanguage: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  originalText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 20,
    marginTop: 8,
    fontStyle: "italic",
  },
  originalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  originalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  originalFullText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
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
    padding: 20,
    borderRadius: 16,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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