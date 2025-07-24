import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert } from "react-native";
import { Stack } from "expo-router";
import { Plus, FileText, Clock } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useNotes } from "@/hooks/use-notes";
import NoteCard from "@/components/NoteCard";
import CreateNoteModal from "@/components/CreateNoteModal";
import NoteEditor from "@/components/NoteEditor";
import { Note } from "@/types/note";

export default function NotesScreen() {
  const { colors } = useTheme();
  const { notes, isLoading } = useNotes();
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

  if (selectedNote) {
    return (
      <NoteEditor 
        note={selectedNote} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "AI Notes",
          headerTitleStyle: [styles.headerTitle, { color: colors.purple.primary }],
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerRight: () => (
            <Pressable
              onPress={handleCreateNote}
              style={({ pressed }) => [
                styles.headerCreateButton,
                { backgroundColor: colors.purple.primary },
                pressed && styles.pressed
              ]}
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          ),
        }} 
      />

      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={64} color={colors.purple.light} />
          <Text style={[styles.emptyTitle, { color: colors.purple.primary }]}>
            No Notes Yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.darkGray }]}>
            Create AI-powered notes from your audio transcriptions
          </Text>
          <Pressable
            onPress={handleCreateNote}
            style={({ pressed }) => [
              styles.emptyCreateButton,
              { backgroundColor: colors.purple.primary },
              pressed && styles.pressed
            ]}
          >
            <Plus size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.emptyCreateButtonText}>Create Your First Note</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.notesContainer}>
          <View style={styles.createNoteSection}>
            <Pressable
              onPress={handleCreateNote}
              style={({ pressed }) => [
                styles.createNoteButton,
                { backgroundColor: colors.purple.primary },
                pressed && styles.pressed
              ]}
            >
              <Plus size={18} color="#fff" style={styles.createButtonIcon} />
              <Text style={styles.createNoteButtonText}>Create New Note</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            style={styles.notesList}
            contentContainerStyle={styles.notesListContent}
            showsVerticalScrollIndicator={false}
          >
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPress={() => handleNoteSelect(note)}
              />
            ))}
          </ScrollView>
        </View>
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
  headerTitle: {
    fontWeight: "600",
  },
  headerCreateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  notesContainer: {
    flex: 1,
  },
  createNoteSection: {
    padding: 16,
    paddingBottom: 8,
  },
  createNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createNoteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyCreateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    padding: 16,
    paddingTop: 0,
  },
});