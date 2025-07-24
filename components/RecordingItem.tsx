import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { Trash2, Play, Pause, FileText, Edit3, Check, X, Users, Globe } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { Recording } from "@/types/recording";

interface RecordingItemProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onTranscribe?: (recording: Recording) => void;
  onTranscribeWithSpeakers?: (recording: Recording) => void;
  isTranscribing?: boolean;
  isDiarizing?: boolean;
  isPlaying?: boolean;
  isPaused?: boolean;
}

export default function RecordingItem({ 
  recording, 
  onPlay, 
  onDelete,
  onRename,
  onTranscribe,
  onTranscribeWithSpeakers,
  isTranscribing = false,
  isDiarizing = false,
  isPlaying = false,
  isPaused = false
}: RecordingItemProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recording.title);
  const [showTranscribeOptions, setShowTranscribeOptions] = useState(false);
  
  const formattedDate = new Date(recording.createdAt).toLocaleDateString();
  const formattedTime = new Date(recording.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getPlayButtonIcon = () => {
    if (isPlaying) {
      return <Pause size={20} color={colors.purple.primary} />;
    }
    return <Play size={20} color={colors.purple.primary} />;
  };

  const handleRename = () => {
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title cannot be empty");
      setEditTitle(recording.title);
      return;
    }
    
    if (onRename) {
      onRename(recording.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(recording.title);
    setIsEditing(false);
  };

  const handleTranscribePress = () => {
    if (recording.transcription || recording.speakerSegments) {
      // Already transcribed, just show the transcription
      if (onTranscribe) {
        onTranscribe(recording);
      }
    } else {
      // Show transcription options
      setShowTranscribeOptions(true);
    }
  };

  const handleRegularTranscribe = () => {
    setShowTranscribeOptions(false);
    if (onTranscribe) {
      onTranscribe(recording);
    }
  };

  const handleSpeakerTranscribe = () => {
    setShowTranscribeOptions(false);
    if (onTranscribeWithSpeakers) {
      onTranscribeWithSpeakers(recording);
    }
  };

  const getTranscriptionStatus = () => {
    if (recording.speakerSegments && recording.speakerSegments.length > 0) {
      return `${recording.speakers?.length || 0} speakers`;
    } else if (recording.transcription) {
      return "Transcribed";
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.infoContainer}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, { 
                backgroundColor: colors.lightGray, 
                color: colors.text,
                borderColor: colors.purple.primary 
              }]}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={handleRename}
                style={({ pressed }) => [
                  styles.editActionButton,
                  { backgroundColor: colors.success },
                  pressed && styles.pressed
                ]}
              >
                <Check size={16} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handleCancelEdit}
                style={({ pressed }) => [
                  styles.editActionButton,
                  { backgroundColor: colors.danger },
                  pressed && styles.pressed
                ]}
              >
                <X size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={[styles.title, { color: colors.text }]}>{recording.title}</Text>
        )}
        
        <Text style={[styles.details, { color: colors.darkGray }]}>
          {formattedDate} • {formattedTime} • {formatDuration(recording.duration)}
        </Text>
        
        <View style={styles.badgesContainer}>
          {recording.detectedLanguage && (
            <View style={[styles.languageBadge, { backgroundColor: colors.blue.primary }]}>
              <Globe size={10} color="#fff" style={styles.badgeIcon} />
              <Text style={styles.languageBadgeText}>{recording.detectedLanguage}</Text>
            </View>
          )}
          
          {getTranscriptionStatus() && (
            <View style={[styles.transcriptionBadge, { 
              backgroundColor: recording.speakerSegments ? colors.purple.primary : colors.purple.light 
            }]}>
              {recording.speakerSegments && (
                <Users size={12} color="#fff" style={styles.badgeIcon} />
              )}
              <Text style={styles.transcriptionBadgeText}>{getTranscriptionStatus()}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        {onRename && !isEditing && (
          <Pressable 
            onPress={() => setIsEditing(true)}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Edit3 size={20} color={colors.purple.primary} />
          </Pressable>
        )}
        
        {(onTranscribe || onTranscribeWithSpeakers) && (
          <Pressable 
            onPress={handleTranscribePress}
            disabled={isTranscribing || isDiarizing}
            style={({ pressed }) => [
              styles.actionButton, 
              pressed && styles.pressed,
              (isTranscribing || isDiarizing) && styles.disabled
            ]}
          >
            {isTranscribing || isDiarizing ? (
              <ActivityIndicator size={20} color={colors.purple.primary} />
            ) : (
              <FileText 
                size={20} 
                color={recording.transcription || recording.speakerSegments ? colors.success : colors.purple.primary} 
              />
            )}
          </Pressable>
        )}
        
        <Pressable 
          onPress={() => onPlay(recording)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          {getPlayButtonIcon()}
        </Pressable>
        
        <Pressable 
          onPress={() => onDelete(recording.id)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Trash2 size={20} color={colors.danger} />
        </Pressable>
      </View>

      {/* Transcription Options Modal */}
      {showTranscribeOptions && (
        <View style={styles.optionsOverlay}>
          <View style={[styles.optionsModal, { 
            backgroundColor: colors.background,
            borderColor: colors.mediumGray 
          }]}>
            <Text style={[styles.optionsTitle, { color: colors.text }]}>Choose Transcription Type</Text>
            
            <Pressable
              onPress={handleRegularTranscribe}
              style={({ pressed }) => [
                styles.optionButton,
                { backgroundColor: colors.lightGray },
                pressed && styles.pressed
              ]}
            >
              <FileText size={20} color={colors.purple.primary} />
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Multi-Language Transcription</Text>
                <Text style={[styles.optionDescription, { color: colors.darkGray }]}>
                  Auto-detect language and translate to English
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleSpeakerTranscribe}
              style={({ pressed }) => [
                styles.optionButton,
                { backgroundColor: colors.lightGray },
                pressed && styles.pressed
              ]}
            >
              <Users size={20} color={colors.purple.primary} />
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Multi-Language Speaker Diarization</Text>
                <Text style={[styles.optionDescription, { color: colors.darkGray }]}>
                  Identify speakers with language detection and translation
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setShowTranscribeOptions(false)}
              style={({ pressed }) => [
                styles.cancelButton,
                { backgroundColor: colors.danger },
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  editActions: {
    flexDirection: "row",
    gap: 4,
  },
  editActionButton: {
    padding: 6,
    borderRadius: 6,
  },
  details: {
    fontSize: 13,
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  languageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  languageBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  transcriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeIcon: {
    marginRight: 3,
  },
  transcriptionBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 12,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  disabled: {
    opacity: 0.5,
  },
  optionsOverlay: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  optionsModal: {
    padding: 24,
    borderRadius: 20,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionContent: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});