import React, { useState } from "react";
import { StyleSheet, Text, View, Modal, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { X, FileText, Mic, Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRecordings } from "@/hooks/use-recordings";
import { useNotes } from "@/hooks/use-notes";
import { Note } from "@/types/note";
import { Recording } from "@/types/recording";

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateNoteModal({ visible, onClose }: CreateNoteModalProps) {
  const { colors } = useTheme();
  const { recordings } = useRecordings();
  const { addNote } = useNotes();
  const [title, setTitle] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [createType, setCreateType] = useState<'blank' | 'fromRecording'>('blank');

  // Get all recordings (not just transcribed ones) for selection
  const availableRecordings = recordings;
  const transcribedRecordings = recordings.filter(r => r.transcription);

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your note");
      return;
    }

    if (createType === 'fromRecording' && !selectedRecording) {
      Alert.alert("Error", "Please select a recording");
      return;
    }

    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim(),
      content: createType === 'fromRecording' && selectedRecording?.transcription 
        ? selectedRecording.transcription 
        : "",
      originalTranscription: selectedRecording?.transcription,
      recordingId: selectedRecording?.id,
      recordingTitle: selectedRecording?.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addNote(newNote);
    
    // Reset form
    setTitle("");
    setSelectedRecording(null);
    setCreateType('blank');
    
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setSelectedRecording(null);
    setCreateType('blank');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.mediumGray }]}>
          <Text style={[styles.title, { color: colors.text }]}>Create New Note</Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Note Title</Text>
            <TextInput
              style={[styles.titleInput, { 
                backgroundColor: colors.lightGray, 
                color: colors.text,
                borderColor: colors.mediumGray 
              }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter note title..."
              placeholderTextColor={colors.darkGray}
              autoFocus
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Create From</Text>
            
            <Pressable
              onPress={() => setCreateType('blank')}
              style={({ pressed }) => [
                styles.optionCard,
                { 
                  backgroundColor: createType === 'blank' ? colors.purple.light : colors.lightGray,
                  borderColor: createType === 'blank' ? colors.purple.primary : colors.mediumGray
                },
                pressed && styles.pressed
              ]}
            >
              <FileText 
                size={24} 
                color={createType === 'blank' ? "#fff" : colors.purple.primary} 
              />
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle, 
                  { color: createType === 'blank' ? "#fff" : colors.text }
                ]}>
                  Blank Note
                </Text>
                <Text style={[
                  styles.optionDescription, 
                  { color: createType === 'blank' ? "rgba(255,255,255,0.8)" : colors.darkGray }
                ]}>
                  Start with an empty note
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setCreateType('fromRecording')}
              style={({ pressed }) => [
                styles.optionCard,
                { 
                  backgroundColor: createType === 'fromRecording' ? colors.purple.light : colors.lightGray,
                  borderColor: createType === 'fromRecording' ? colors.purple.primary : colors.mediumGray
                },
                pressed && styles.pressed
              ]}
            >
              <Mic 
                size={24} 
                color={createType === 'fromRecording' ? "#fff" : colors.purple.primary} 
              />
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle, 
                  { color: createType === 'fromRecording' ? "#fff" : colors.text }
                ]}>
                  From Audio Recording
                </Text>
                <Text style={[
                  styles.optionDescription, 
                  { color: createType === 'fromRecording' ? "rgba(255,255,255,0.8)" : colors.darkGray }
                ]}>
                  Use existing audio recording
                </Text>
              </View>
            </Pressable>
          </View>

          {createType === 'fromRecording' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select Recording ({availableRecordings.length} available)
              </Text>
              
              {availableRecordings.length === 0 ? (
                <View style={[styles.emptyRecordings, { backgroundColor: colors.lightGray }]}>
                  <Text style={[styles.emptyRecordingsText, { color: colors.darkGray }]}>
                    No recordings available. Record some audio first.
                  </Text>
                </View>
              ) : (
                availableRecordings.map((recording) => (
                  <Pressable
                    key={recording.id}
                    onPress={() => setSelectedRecording(recording)}
                    style={({ pressed }) => [
                      styles.recordingCard,
                      { 
                        backgroundColor: selectedRecording?.id === recording.id 
                          ? colors.purple.light 
                          : colors.lightGray,
                        borderColor: selectedRecording?.id === recording.id 
                          ? colors.purple.primary 
                          : colors.mediumGray
                      },
                      pressed && styles.pressed
                    ]}
                  >
                    <View style={styles.recordingHeader}>
                      <Text style={[
                        styles.recordingTitle,
                        { color: selectedRecording?.id === recording.id ? "#fff" : colors.text }
                      ]}>
                        {recording.title}
                      </Text>
                      {recording.transcription && (
                        <View style={[
                          styles.transcribedBadge,
                          { backgroundColor: selectedRecording?.id === recording.id ? "#fff" : colors.success }
                        ]}>
                          <Text style={[
                            styles.transcribedBadgeText,
                            { color: selectedRecording?.id === recording.id ? colors.purple.primary : "#fff" }
                          ]}>
                            Transcribed
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.recordingDate,
                      { color: selectedRecording?.id === recording.id 
                          ? "rgba(255,255,255,0.8)" 
                          : colors.darkGray }
                    ]}>
                      {new Date(recording.createdAt).toLocaleDateString()}
                    </Text>
                    {!recording.transcription && (
                      <Text style={[
                        styles.noTranscriptionNote,
                        { color: selectedRecording?.id === recording.id 
                            ? "rgba(255,255,255,0.7)" 
                            : colors.darkGray }
                      ]}>
                        Note will be created without transcription
                      </Text>
                    )}
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.mediumGray }]}>
          <Pressable
            onPress={handleCreate}
            disabled={!title.trim() || (createType === 'fromRecording' && !selectedRecording)}
            style={({ pressed }) => [
              styles.createButton,
              { backgroundColor: colors.purple.primary },
              pressed && styles.pressed,
              (!title.trim() || (createType === 'fromRecording' && !selectedRecording)) && styles.disabled
            ]}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Note</Text>
          </Pressable>
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
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
  emptyRecordings: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyRecordingsText: {
    fontSize: 14,
    textAlign: "center",
  },
  recordingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  recordingTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  transcribedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  transcribedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  recordingDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  noTranscriptionNote: {
    fontSize: 11,
    fontStyle: "italic",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});