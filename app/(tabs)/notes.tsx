import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, ActivityIndicator, FlatList } from "react-native";
import { Stack } from "expo-router";
import { Plus, FileText, Trash2 } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useNotes } from "@/hooks/use-notes";
import NoteCard from "@/components/NoteCard";
import CreateNoteModal from "@/components/CreateNoteModal";
import NoteEditor from "@/components/NoteEditor";
import { Note } from "@/types/note";

export default function NotesScreen() {
  const { colors } = useTheme();
  const { notes, isLoading, clearAllNotes } = useNotes();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleCreateNote = () => {
    setShowCreateModal(true);
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
  };

  const handleBackToList = () => {
    setSelectedNote(null);
  };

  const handleClearAll = () => {
    if (notes.length === 0) {
      Alert.alert("No Notes", "There are no notes to clear.");
      return;
    }

    Alert.alert(
      "Clear All Notes",
      `Are you sure you want to delete all ${notes.length} note${notes.length === 1 ? '' : 's'}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllNotes();
              Alert.alert("Success", "All notes have been cleared.");
            } catch (error) {
              console.error("Error clearing notes:", error);
              Alert.alert("Error", "Failed to clear notes. Please try again.");
            }
          }
        },
      ]
    );
  };

  if (selectedNote) {
    return (
      <NoteEditor 
        note={selectedNote} 
        onBack={handleBackToList}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.purple.primary} />
        <Text style={[styles.loadingText, { color: colors.purple.primary }]}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Notes",
          headerTitleStyle: [styles.screenHeaderTitle, { color: colors.text }],
          headerStyle: {
            backgroundColor: colors.background,
          },
        }} 
      />

      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: colors.purple.primary }]}>
        <Text style={styles.headerTitle}>Your AI Notes</Text>
        <Text style={styles.noteCount}>
          {notes.length} note{notes.length === 1 ? '' : 's'}
        </Text>
        
        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleCreateNote}
            style={({ pressed }) => [
              styles.createButton,
              { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              pressed && styles.buttonPressed
            ]}
          >
            <Plus size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Create Note</Text>
          </Pressable>
          
          {notes.length > 0 && (
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

      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No notes yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.darkGray }]}>
            Create AI-powered notes from your audio transcriptions
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => handleNoteSelect(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateNoteModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
  noteCount: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  createButton: {
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