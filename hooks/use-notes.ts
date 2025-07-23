import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { Note } from "@/types/note";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export const [NotesProvider, useNotes] = createContextHook(() => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getStorageKey = () => {
    return user ? `ai_notes_${user.id}` : "ai_notes_guest";
  };

  // Helper function to deduplicate notes by ID
  const deduplicateNotes = (notesList: Note[]): Note[] => {
    const seen = new Set<string>();
    return notesList.filter(note => {
      if (seen.has(note.id)) {
        return false;
      }
      seen.add(note.id);
      return true;
    });
  };

  // Count unsynced notes
  const countUnsyncedNotes = (notesList: Note[]): number => {
    return notesList.filter(note => note.isSynced === false).length;
  };

  // Fetch notes from database with local storage fallback
  const notesQuery = trpc.notes.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      retry: 2,
      staleTime: 30000,
      onError: (error) => {
        console.error("Failed to fetch notes from database:", error);
        Alert.alert(
          "Connection Error", 
          "Failed to load notes from server. Showing offline data."
        );
      }
    }
  );

  // Create note mutation
  const createMutation = trpc.notes.create.useMutation({
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: [['notes', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousNotes = queryClient.getQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }]);
      
      const optimisticNote: Note = {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        originalTranscription: newNote.originalTranscription,
        recordingId: newNote.recordingId,
        recordingTitle: newNote.recordingTitle,
        summary: newNote.summary,
        keyPoints: newNote.keyPoints,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSynced: true,
      };
      
      queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], (old: Note[] | undefined) => {
        const oldData = old || [];
        return deduplicateNotes([optimisticNote, ...oldData]);
      });
      
      return { previousNotes, optimisticNote };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], (old: Note[] | undefined) => {
        const oldData = old || [];
        return deduplicateNotes(oldData.map(n => n.id === variables.id ? {
          id: data.note.id,
          title: data.note.title,
          content: data.note.content,
          originalTranscription: data.note.originalTranscription,
          recordingId: data.note.recordingId,
          recordingTitle: data.note.recordingTitle,
          summary: data.note.summary,
          keyPoints: data.note.keyPoints,
          createdAt: data.note.createdAt,
          updatedAt: data.note.updatedAt,
          isSynced: true,
        } : n));
      });
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to save note to database, saving locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to save note to server. It has been saved locally and will sync when connection is restored."
      );
      
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      try {
        const currentNotes = notes;
        const newNote: Note = {
          id: variables.id,
          title: variables.title,
          content: variables.content,
          originalTranscription: variables.originalTranscription,
          recordingId: variables.recordingId,
          recordingTitle: variables.recordingTitle,
          summary: variables.summary,
          keyPoints: variables.keyPoints,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSynced: false, // Mark as unsynced
        };
        const updated = deduplicateNotes([newNote, ...currentNotes]);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updated));
        setNotes(updated);
        setUnsyncedCount(countUnsyncedNotes(updated));
      } catch (storageError) {
        console.error("Failed to save to local storage:", storageError);
        Alert.alert("Error", "Failed to save note. Please try again.");
      }
    }
  });

  // Update note mutation
  const updateMutation = trpc.notes.update.useMutation({
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: [['notes', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousNotes = queryClient.getQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }]);
      
      queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], (old: Note[] | undefined) => {
        const oldData = old || [];
        return oldData.map(note => 
          note.id === updatedNote.id 
            ? { 
                ...note, 
                title: updatedNote.title || note.title,
                content: updatedNote.content || note.content,
                summary: updatedNote.summary || note.summary,
                keyPoints: updatedNote.keyPoints || note.keyPoints,
                updatedAt: new Date(),
                isSynced: true,
              }
            : note
        );
      });
      
      return { previousNotes };
    },
    onSuccess: () => {
      // Data is already optimistically updated
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to update note in database, saving locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to update note on server. Changes saved locally and will sync when connection is restored."
      );
      
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      try {
        const updated = notes.map(note => 
          note.id === variables.id 
            ? { 
                ...note, 
                title: variables.title || note.title,
                content: variables.content || note.content,
                summary: variables.summary || note.summary,
                keyPoints: variables.keyPoints || note.keyPoints,
                updatedAt: new Date(),
                isSynced: false, // Mark as unsynced
              }
            : note
        );
        const deduplicated = deduplicateNotes(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setNotes(deduplicated);
        setUnsyncedCount(countUnsyncedNotes(deduplicated));
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
        Alert.alert("Error", "Failed to save changes. Please try again.");
      }
    }
  });

  // Delete note mutation
  const deleteMutation = trpc.notes.delete.useMutation({
    onMutate: async (deleteVars) => {
      await queryClient.cancelQueries({ queryKey: [['notes', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousNotes = queryClient.getQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }]);
      
      queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], (old: Note[] | undefined) => {
        return (old || []).filter(note => note.id !== deleteVars.id);
      });
      
      return { previousNotes };
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to delete note from database, removing locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to delete note from server. It has been removed locally and will sync when connection is restored."
      );
      
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      try {
        const updated = notes.filter(note => note.id !== variables.id);
        const deduplicated = deduplicateNotes(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setNotes(deduplicated);
        setUnsyncedCount(countUnsyncedNotes(deduplicated));
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
        Alert.alert("Error", "Failed to delete note. Please try again.");
      }
    }
  });

  // Sync unsynced notes to database
  const syncUnsyncedNotes = async () => {
    if (!user?.id || isSyncing) return;
    
    const unsyncedNotes = notes.filter(note => note.isSynced === false);
    if (unsyncedNotes.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      for (const note of unsyncedNotes) {
        try {
          await createMutation.mutateAsync({
            id: note.id,
            title: note.title,
            content: note.content,
            originalTranscription: note.originalTranscription,
            recordingId: note.recordingId,
            recordingTitle: note.recordingTitle,
            summary: note.summary,
            keyPoints: note.keyPoints,
            userId: user.id,
          });
          
          // Mark as synced in local storage
          const updatedNotes = notes.map(n => 
            n.id === note.id ? { ...n, isSynced: true } : n
          );
          setNotes(updatedNotes);
          await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updatedNotes));
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync note ${note.id}:`, error);
        }
      }

      if (syncedCount > 0) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${syncedCount} note${syncedCount !== 1 ? 's' : ''} to server.`
        );
        setUnsyncedCount(countUnsyncedNotes(notes));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Load from local storage and sync
  useEffect(() => {
    const loadFromLocalStorage = async () => {
      if (!user?.id) return;
      
      try {
        const stored = await AsyncStorage.getItem(getStorageKey());
        const localNotes = stored ? (JSON.parse(stored) as Note[]) : [];
        
        if (notesQuery.data && notesQuery.data.length > 0) {
          // Merge server data with local unsynced data
          const serverNotes = notesQuery.data.map(note => ({ ...note, isSynced: true }));
          const unsyncedLocal = localNotes.filter(note => note.isSynced === false);
          const merged = deduplicateNotes([...unsyncedLocal, ...serverNotes]);
          setNotes(merged);
          setUnsyncedCount(countUnsyncedNotes(merged));
        } else if (notesQuery.isError && localNotes.length > 0) {
          const deduplicated = deduplicateNotes(localNotes);
          setNotes(deduplicated);
          setUnsyncedCount(countUnsyncedNotes(deduplicated));
        } else if (notesQuery.isSuccess) {
          setNotes([]);
          setUnsyncedCount(0);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotes([]);
        setUnsyncedCount(0);
      }
    };

    if (notesQuery.isSuccess || notesQuery.isError) {
      loadFromLocalStorage();
    }
  }, [notesQuery.data, notesQuery.isSuccess, notesQuery.isError, user?.id]);

  // Auto-sync when user is authenticated and has unsynced data
  useEffect(() => {
    if (user?.id && unsyncedCount > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        syncUnsyncedNotes();
      }, 2000); // Wait 2 seconds after load to attempt sync

      return () => clearTimeout(timer);
    }
  }, [user?.id, unsyncedCount]);

  // Clear notes when user changes
  useEffect(() => {
    if (!user?.id) {
      setNotes([]);
      setUnsyncedCount(0);
    }
  }, [user?.id]);

  const addNote = (note: Note) => {
    if (!user?.id) {
      console.warn("Cannot add note: user not authenticated");
      return;
    }
    
    createMutation.mutate({
      id: note.id,
      title: note.title,
      content: note.content,
      originalTranscription: note.originalTranscription,
      recordingId: note.recordingId,
      recordingTitle: note.recordingTitle,
      summary: note.summary,
      keyPoints: note.keyPoints,
      userId: user.id,
    });
  };

  const updateNote = (updatedNote: Note) => {
    if (!user?.id) {
      console.warn("Cannot update note: user not authenticated");
      return;
    }
    
    updateMutation.mutate({
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      summary: updatedNote.summary,
      keyPoints: updatedNote.keyPoints,
      userId: user.id,
    });
  };

  const deleteNote = (id: string) => {
    if (!user?.id) {
      console.warn("Cannot delete note: user not authenticated");
      return;
    }
    
    deleteMutation.mutate({ id, userId: user.id });
  };

  const clearAllNotes = async () => {
    setNotes([]);
    setUnsyncedCount(0);
    if (user?.id) {
      await AsyncStorage.removeItem(getStorageKey());
    }
  };

  const currentNotes = notesQuery.data ? deduplicateNotes(notesQuery.data) : notes;

  return { 
    notes: currentNotes, 
    addNote, 
    updateNote, 
    deleteNote,
    clearAllNotes,
    syncUnsyncedNotes,
    isLoading: notesQuery.isLoading,
    isSyncing,
    unsyncedCount,
    error: notesQuery.error
  };
});