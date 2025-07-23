import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, FlatList, Alert, ActivityIndicator } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { useRecordings } from "@/hooks/use-recordings";
import { useTheme } from "@/hooks/use-theme";
import { useTranscription } from "@/hooks/use-transcription";
import RecordingItem from "@/components/RecordingItem";
import UploadButton from "@/components/UploadButton";
import TranscriptionModal from "@/components/TranscriptionModal";
import { Recording } from "@/types/recording";

export default function HistoryScreen() {
  const { recordings, deleteRecording, addRecording, updateRecording, isLoading } = useRecordings();
  const { colors } = useTheme();
  const { transcribeAudio, transcribeWithSpeakers, isTranscribing, isDiarizing } = useTranscription();
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

    // Transcribe the audio
    const transcription = await transcribeAudio(recording);
    if (transcription) {
      const updatedRecording = { ...recording, transcription };
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

    // Transcribe with speaker diarization
    const result = await transcribeWithSpeakers(recording);
    if (result) {
      const updatedRecording = { 
        ...recording, 
        transcription: result.full_text,
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

  // Ensure recordings have unique keys
  const safeRecordings = recordings.filter((recording, index, self) => 
    index === self.findIndex(r => r.id === recording.id)
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.purple.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Recording History",
          headerTitleStyle: [styles.headerTitle, { color: colors.purple.primary }],
          headerStyle: {
            backgroundColor: colors.background,
          },
        }} 
      />

      {safeRecordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.purple.primary }]}>No recordings yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.darkGray }]}>
            Record audio or upload existing files
          </Text>
          <View style={styles.uploadButtonContainer}>
            <UploadButton onPress={handleUpload} loading={uploading} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.uploadSection}>
            <UploadButton onPress={handleUpload} loading={uploading} />
          </View>
          
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
                isTranscribing={isTranscribing === item.id}
                isDiarizing={isDiarizing === item.id}
                isPlaying={playingId === item.id && !isPaused}
                isPaused={playingId === item.id && isPaused}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
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
  headerTitle: {
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
  },
  uploadButtonContainer: {
    marginTop: 20,
  },
  uploadSection: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
});