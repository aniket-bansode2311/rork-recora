import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Clock, FileText, Mic } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { Note } from "@/types/note";

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export default function NoteCard({ note, onPress }: NoteCardProps) {
  const { colors } = useTheme();

  const formatDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return noteDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return noteDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPreviewText = (content: string) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.background },
        pressed && styles.pressed
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <FileText size={18} color={colors.purple.primary} />
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {note.title}
          </Text>
        </View>
        <Text style={[styles.date, { color: colors.darkGray }]}>
          {formatDate(note.updatedAt)}
        </Text>
      </View>

      <Text style={[styles.preview, { color: colors.darkGray }]} numberOfLines={3}>
        {getPreviewText(note.content)}
      </Text>

      <View style={styles.footer}>
        <View style={styles.metadata}>
          <Clock size={14} color={colors.darkGray} />
          <Text style={[styles.metadataText, { color: colors.darkGray }]}>
            Updated {formatDate(note.updatedAt)}
          </Text>
        </View>
        
        {note.recordingId && (
          <View style={[styles.recordingBadge, { backgroundColor: colors.purple.light }]}>
            <Mic size={12} color="#fff" />
            <Text style={styles.recordingBadgeText}>From Audio</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  date: {
    fontSize: 12,
    fontWeight: "500",
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  metadataText: {
    fontSize: 12,
    marginLeft: 4,
  },
  recordingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordingBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
});