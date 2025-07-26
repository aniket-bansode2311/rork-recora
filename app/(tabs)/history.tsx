import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, FlatList, Alert, ActivityIndicator, Pressable } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { Trash2, Upload } from "lucide-react-native";
import { useRecordings } from "@/hooks/use-recordings";
import { useTheme } from "@/hooks/use-theme";
import { useTranscription } from "@/hooks/use-transcription";
import RecordingItem from "@/components/RecordingItem";
import TranscriptionModal from "@/components/TranscriptionModal";
import { Recording } from "@/types/recording";

export default function HistoryScreen() {
  const { recordings, deleteRecording, addRecording, updateRecording, clearAllRecordings, isLoading, error, recordingsCount } = useRecordings();
  const { colors } = useTheme();
  const { transcribeAndTranslateAudio, transcribeWithSpeakers, isTranscribing, isDiarizing, isTranslating } = useTranscription();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);

  // Clean up audio when component unmounts or loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        if (sound) {
          sound.unloadAsync();
          setSound(null);
          setPlayingId(null);
          setIsPaused(false);
        }
      };
    }, [sound])
  );

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlay = async (recording: Recording) => {
    try {
      // If this is the same recording that's currently loaded
      if (playingId === recording.id && sound) {
        if (isPaused) {
          // Resume the paused audio
          await sound.playAsync();
          setIsPaused(false);
          return;
        } else {
          // Pause the currently playing audio
          await sound.pauseAsync();
          setIsPaused(true);
          return;
        }
      }

      // Stop and cleanup current sound if playing a different recording
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
        setIsPaused(false);
      }

      // Create and play new sound for the selected recording
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingId(recording.id);
      setIsPaused(false);
      
      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            // Audio finished playing
            setPlayingId(null);
            setIsPaused(false);
            setSound(null);
          }
        }
      });
    } catch (error) {
      console.error("Error playing sound:", error);
      Alert.alert("Error", "Failed to play recording");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // Clean up audio if deleting the currently playing recording
            if (playingId === id && sound) {
              sound.unloadAsync();
              setSound(null);
              setPlayingId(null);
              setIsPaused(false);
            }
            deleteRecording(id);
          }
        },
      ]
    );
  };

  const handleRename = (id: string, newTitle: string) => {
    const recording = recordings.find(r => r.id === id);
    if (recording) {
      const updatedRecording = { ...recording, title: newTitle };
      updateRecording(updatedRecording);
    }
  };

  const handleTranscribe = async (recording: Recording) => {
    if (recording.transcription || recording.speakerSegments) {
      // If already transcribed, show the modal
      setSelectedRecording(recording);
      setShowTranscriptionModal(true);
      return;
    }

    // Use multi-language transcription with translation
    const result = await transcribeAndTranslateAudio(recording);
    if (result) {
      const updatedRecording = { 
        ...recording, 
        transcription: result.original_text,
        translatedTranscription: result.translated_text,
        detectedLanguage: result.detected_language
      };
      updateRecording(updatedRecording);
      setSelectedRecording(updatedRecording);
      setShowTranscriptionModal(true);
    }
  };

  const handleTranscribeWithSpeakers = async (recording: Recording) => {
    if (recording.speakerSegments) {
      // If already transcribed with speakers, show the modal
      setSelectedRecording(recording);
      setShowTranscriptionModal(true);
      return;
    }

    // Transcribe with speaker diarization (now includes multi-language support)
    const result = await transcribeWithSpeakers(recording);
    if (result) {
      const updatedRecording = { 
        ...recording, 
        transcription: result.full_text,
        translatedTranscription: result.translated_full_text,
        detectedLanguage: result.detected_language,
        speakerSegments: result.segments,
        speakers: result.speakers
      };
      updateRecording(updatedRecording);
      setSelectedRecording(updatedRecording);
      setShowTranscriptionModal(true);
    }
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file type
        const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/webm'];
        if (!validAudioTypes.includes(asset.mimeType || '')) {
          Alert.alert("Invalid File", "Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, WebM)");
          return;
        }

        // Create recording object with unique ID
        const fileName = asset.name || 'Uploaded Audio';
        const fileExtension = fileName.split('.').pop() || 'unknown';
        const uniqueId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newRecording: Recording = {
          id: uniqueId,
          uri: asset.uri,
          duration: 0, // We don't know the duration yet
          title: fileName,
          createdAt: new Date(),
          fileType: fileExtension,
        };

        addRecording(newRecording);
        Alert.alert("Success", "Audio file uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      Alert.alert("Error", "Failed to upload audio file");
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = () => {
    if (recordings.length === 0) {
      Alert.alert("No Recordings", "There are no recordings to clear.");
      return;
    }

    Alert.alert(
      "Clear All Recordings",
      `Are you sure you want to delete all ${recordings.length} recording${recordings.length === 1 ? '' : 's'}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            try {
              // Stop any playing audio first
              if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingId(null);
                setIsPaused(false);
              }
              
              await clearAllRecordings();
              Alert.alert("Success", "All recordings have been cleared.");
            } catch (error) {
              console.error("Error clearing recordings:", error);
              Alert.alert("Error", "Failed to clear recordings. Please try again.");
            }
          }
        },
      ]
    );
  };

  // Ensure recordings have unique keys
  const safeRecordings = recordings.filter((recording, index, self) => 
    index === self.findIndex(r => r.id === recording.id)
  );

  // Debug logging
  console.log('HISTORY_SCREEN_RENDER: Current state:', {
    recordingsCount: recordings.length,
    safeRecordingsCount: safeRecordings.length,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.purple.primary} />
        <Text style={[styles.loadingText, { color: colors.purple.primary }]}>Loading recordings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Recordings",
          headerTitleStyle: [styles.screenHeaderTitle, { color: colors.text }],
          headerStyle: {
            backgroundColor: colors.background,
          },
        }} 
      />

      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: colors.purple.primary }]}>
        <Text style={styles.headerTitle}>Your Recordings</Text>
        <Text style={styles.recordingCount}>
          {recordingsCount} recording{recordingsCount === 1 ? '' : 's'}
        </Text>
        
        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleUpload}
            disabled={uploading}
            style={({ pressed }) => [
              styles.uploadButton,
              { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              pressed && styles.buttonPressed
            ]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
            ) : (
              <Upload size={20} color="#fff" style={styles.buttonIcon} />
            )}
            <Text style={styles.buttonText}>
              {uploading ? "Uploading..." : "Upload"}
            </Text>
          </Pressable>
          
          {recordingsCount > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => [
                styles.clearButton,
                { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                pressed && styles.buttonPressed
              ]}
            >
              <Trash2 size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {safeRecordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No recordings yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.darkGray }]}>
            Record audio or upload existing files to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={safeRecordings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordingItem
              recording={item}
              onPlay={handlePlay}
              onDelete={handleDelete}
              onRename={handleRename}
              onTranscribe={handleTranscribe}
              onTranscribeWithSpeakers={handleTranscribeWithSpeakers}
              isTranscribing={isTranscribing === item.id || isTranslating === item.id}
              isDiarizing={isDiarizing === item.id}
              isPlaying={playingId === item.id && !isPaused}
              isPaused={playingId === item.id && isPaused}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TranscriptionModal
        visible={showTranscriptionModal}
        recording={selectedRecording}
        onClose={() => {
          setShowTranscriptionModal(false);
          setSelectedRecording(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeaderTitle: {
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  recordingCount: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
  },
});