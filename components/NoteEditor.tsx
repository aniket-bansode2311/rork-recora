import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { ArrowLeft, Save, Search, Sparkles, List, FileText, MoreVertical, Trash2 } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useNotes } from "@/hooks/use-notes";
import { useAIProcessing } from "@/hooks/use-ai-processing";
import { Note } from "@/types/note";
import AIToolbar from "@/components/AIToolbar";
import SearchModal from "@/components/SearchModal";

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
}

export default function NoteEditor({ note, onBack }: NoteEditorProps) {
  const { colors } = useTheme();
  const { updateNote, deleteNote } = useNotes();
  const { processText, isProcessing } = useAIProcessing();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showAIToolbar, setShowAIToolbar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const contentInputRef = useRef<TextInput>(null);

  const handleSave = () => {
    const updatedNote: Note = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
      updatedAt: new Date(),
    };
    
    updateNote(updatedNote);
    setHasUnsavedChanges(false);
    Alert.alert("Saved", "Your note has been saved successfully.");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteNote(note.id);
            onBack();
          }
        },
      ]
    );
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          { text: "Don't Save", style: "destructive", onPress: onBack },
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: () => { handleSave(); onBack(); } }
        ]
      );
    } else {
      onBack();
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleAIProcess = async (type: 'summarize' | 'keyPoints' | 'format' | 'improve') => {
    if (!content.trim()) {
      Alert.alert("No Content", "Please add some content to process with AI.");
      return;
    }

    const result = await processText(content, type);
    if (result) {
      if (type === 'format' || type === 'improve') {
        setContent(result);
      } else {
        // For summarize and keyPoints, append to content
        const separator = content.trim() ? '\n\n---\n\n' : '';
        const header = type === 'summarize' ? '## AI Summary\n\n' : '## Key Points\n\n';
        setContent(content + separator + header + result);
      }
      setHasUnsavedChanges(true);
    }
    setShowAIToolbar(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.mediumGray }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowSearch(true)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Search size={22} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => setShowAIToolbar(!showAIToolbar)}
            style={({ pressed }) => [
              styles.headerButton, 
              { backgroundColor: showAIToolbar ? colors.purple.light : 'transparent' },
              pressed && styles.pressed
            ]}
          >
            <Sparkles size={22} color={showAIToolbar ? "#fff" : colors.purple.primary} />
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Trash2 size={22} color={colors.danger} />
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={!hasUnsavedChanges}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: hasUnsavedChanges ? colors.purple.primary : colors.mediumGray },
              pressed && styles.pressed
            ]}
          >
            <Save size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>

      {/* AI Toolbar */}
      {showAIToolbar && (
        <AIToolbar
          onProcess={handleAIProcess}
          isProcessing={isProcessing}
          onClose={() => setShowAIToolbar(false)}
        />
      )}

      {/* Editor Content */}
      <ScrollView 
        style={styles.editorContainer}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <TextInput
          style={[styles.titleInput, { color: colors.text }]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Note title..."
          placeholderTextColor={colors.darkGray}
          multiline
          textAlignVertical="top"
        />

        {/* Recording Info */}
        {note.recordingTitle && (
          <View style={[styles.recordingInfo, { backgroundColor: colors.lightGray }]}>
            <FileText size={16} color={colors.purple.primary} />
            <Text style={[styles.recordingInfoText, { color: colors.darkGray }]}>
              From recording: {note.recordingTitle}
            </Text>
          </View>
        )}

        {/* Content Input */}
        <TextInput
          ref={contentInputRef}
          style={[styles.contentInput, { color: colors.text }]}
          value={content}
          onChangeText={handleContentChange}
          placeholder="Start writing your note..."
          placeholderTextColor={colors.darkGray}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        content={content}
        onClose={() => setShowSearch(false)}
      />
    </KeyboardAvoidingView>
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
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  editorContainer: {
    flex: 1,
  },
  editorContent: {
    padding: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    minHeight: 40,
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  recordingInfoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 400,
  },
});