import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { Trash2, Play, Pause, FileText, Edit3, Check, X } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { Recording } from "@/types/recording";

interface RecordingItemProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onTranscribe?: (recording: Recording) => void;
  isTranscribing?: boolean;
  isPlaying?: boolean;
  isPaused?: boolean;
}

export default function RecordingItem({ 
  recording, 
  onPlay, 
  onDelete,
  onRename,
  onTranscribe,
  isTranscribing = false,
  isPlaying = false,
  isPaused = false
}: RecordingItemProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recording.title);
  
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
        {recording.transcription && (
          <View style={[styles.transcriptionBadge, { backgroundColor: colors.purple.light }]}>
            <Text style={styles.transcriptionBadgeText}>Transcribed</Text>
          </View>
        )}
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
        
        {onTranscribe && (
          <Pressable 
            onPress={() => onTranscribe(recording)}
            disabled={isTranscribing}
            style={({ pressed }) => [
              styles.actionButton, 
              pressed && styles.pressed,
              isTranscribing && styles.disabled
            ]}
          >
            {isTranscribing ? (
              <ActivityIndicator size={20} color={colors.purple.primary} />
            ) : (
              <FileText 
                size={20} 
                color={recording.transcription ? colors.success : colors.purple.primary} 
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    marginBottom: 8,
  },
  transcriptionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
    padding: 10,
    marginLeft: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
  },
  disabled: {
    opacity: 0.5,
  },
});