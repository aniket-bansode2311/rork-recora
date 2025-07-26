import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Modal, Pressable, Alert, Platform } from "react-native";
import { ArrowLeft, Trash2, Share, Sparkles, Pause, Play } from "lucide-react-native";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/hooks/use-theme";
import { Recording } from "@/types/recording";

interface RecordingDetailModalProps {
  visible: boolean;
  recording: Recording | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onTranscribe: (recording: Recording) => void;
  isTranscribing?: boolean;
}

export default function RecordingDetailModal({ 
  visible, 
  recording, 
  onClose, 
  onDelete, 
  onTranscribe,
  isTranscribing = false
}: RecordingDetailModalProps) {
  const { colors } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!visible && sound) {
      sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setIsPaused(false);
      setPosition(0);
      setDuration(0);
    }
  }, [visible, sound]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handlePlayPause = async () => {
    try {
      if (!recording) return;

      if (!sound) {
        // Create new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recording.uri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        setIsPaused(false);
        
        // Set up playback status listener
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setIsPaused(false);
              setPosition(0);
            }
          }
        });
      } else {
        if (isPlaying && !isPaused) {
          // Pause
          await sound.pauseAsync();
          setIsPaused(true);
          setIsPlaying(false);
        } else {
          // Resume or play
          await sound.playAsync();
          setIsPlaying(true);
          setIsPaused(false);
        }
      }
    } catch (error) {
      console.error("Error playing sound:", error);
      Alert.alert("Error", "Failed to play recording");
    }
  };

  const handleShare = async () => {
    try {
      if (!recording) return;
      
      if (Platform.OS === 'web') {
        Alert.alert("Share", "Sharing is not available on web");
        return;
      }
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(recording.uri, {
          mimeType: 'audio/m4a',
          dialogTitle: `Share ${recording.title}`,
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to share recording");
    }
  };

  const handleDelete = () => {
    if (!recording) return;
    
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            onDelete(recording.id);
            onClose();
          }
        },
      ]
    );
  };

  const handleTranscribe = () => {
    if (!recording) return;
    onTranscribe(recording);
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (position / duration) * 100;
  };

  if (!recording) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.purple.primary }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Trash2 size={24} color="#ff4444" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{recording.title}</Text>
          <Text style={styles.date}>{formatDate(new Date(recording.createdAt))}</Text>
          
          {/* Audio Visualizer Placeholder */}
          <View style={styles.visualizerContainer}>
            <View style={styles.visualizer}>
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${getProgressPercentage()}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
          
          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration || recording.duration)}</Text>
          </View>
          
          {/* Play Button */}
          <View style={styles.playButtonContainer}>
            <Pressable
              onPress={handlePlayPause}
              style={({ pressed }) => [
                styles.playButton,
                pressed && styles.playButtonPressed
              ]}
            >
              {isPlaying ? (
                <Pause size={32} color={colors.purple.primary} />
              ) : (
                <Play size={32} color={colors.purple.primary} style={{ marginLeft: 4 }} />
              )}
            </Pressable>
          </View>
          
          {/* Transcribe Button */}
          <Pressable
            onPress={handleTranscribe}
            disabled={isTranscribing}
            style={({ pressed }) => [
              styles.transcribeButton,
              pressed && styles.transcribeButtonPressed,
              isTranscribing && styles.transcribeButtonDisabled
            ]}
          >
            <Sparkles size={20} color="#fff" style={styles.transcribeIcon} />
            <Text style={styles.transcribeButtonText}>
              {isTranscribing ? "Transcribing..." : "Transcribe with AI"}
            </Text>
          </Pressable>
          
          <Text style={styles.transcribeDescription}>
            Get accurate transcription with speaker identification using advanced AI. Supports any language with automatic translation to English.
          </Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionButton,
                styles.shareButton,
                pressed && styles.actionButtonPressed
              ]}
            >
              <Share size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </Pressable>
            
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.actionButton,
                styles.deleteButton,
                pressed && styles.actionButtonPressed
              ]}
            >
              <Trash2 size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 40,
  },
  visualizerContainer: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  visualizer: {
    width: "90%",
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    justifyContent: "center",
    overflow: "hidden",
  },
  progressContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 40,
  },
  timeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  playButtonContainer: {
    marginBottom: 60,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  transcribeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  transcribeButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  transcribeButtonDisabled: {
    opacity: 0.6,
  },
  transcribeIcon: {
    marginRight: 8,
  },
  transcribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transcribeDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});