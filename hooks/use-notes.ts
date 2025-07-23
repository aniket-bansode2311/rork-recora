import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Note } from "@/types/note";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export const [NotesProvider, useNotes] = createContextHook(() => {
  const [notes, setNotes] = useState<Note[]>([]);
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

  // Fetch notes from database with local storage fallback
  const notesQuery = trpc.notes.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      retry: 2,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  // Create note mutation
  const createMutation = trpc.notes.create.useMutation({
    onMutate: async (newNote) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [['notes', 'list'], { input: { userId: user?.id || '' } }] });
      
      // Snapshot previous value
      const previousNotes = queryClient.getQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }]);
      
      // Optimistically update
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
      };
      
      queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], (old: Note[] | undefined) => {
        const oldData = old || [];
        return deduplicateNotes([optimisticNote, ...oldData]);
      });
      
      return { previousNotes, optimisticNote };
    },
    onSuccess: (data, variables, context) => {
      // Update with server data
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
        } : n));
      });
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to save note to database, saving locally:", error);
      
      // Revert optimistic update
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      // Fallback to local storage
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
        };
        const updated = deduplicateNotes([newNote, ...currentNotes]);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updated));
        setNotes(updated);
      } catch (storageError) {
        console.error("Failed to save to local storage:", storageError);
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
                updatedAt: new Date()
              }
            : note
        );
      });
      
      return { previousNotes };
    },
    onSuccess: () => {
      // Data is already optimistically updated, no need to refetch
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to update note in database, saving locally:", error);
      
      // Revert optimistic update
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      // Fallback to local storage
      try {
        const updated = notes.map(note => 
          note.id === variables.id 
            ? { 
                ...note, 
                title: variables.title || note.title,
                content: variables.content || note.content,
                summary: variables.summary || note.summary,
                keyPoints: variables.keyPoints || note.keyPoints,
                updatedAt: new Date()
              }
            : note
        );
        const deduplicated = deduplicateNotes(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setNotes(deduplicated);
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
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
      
      // Revert optimistic update
      if (context?.previousNotes) {
        queryClient.setQueryData([['notes', 'list'], { input: { userId: user?.id || '' } }], context.previousNotes);
      }
      
      // Fallback to local storage
      try {
        const updated = notes.filter(note => note.id !== variables.id);
        const deduplicated = deduplicateNotes(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setNotes(deduplicated);
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
      }
    }
  });

  // Load from local storage if database fails
  useEffect(() => {
    const loadFromLocalStorage = async () => {
      if (!user?.id) return;
      
      try {
        const stored = await AsyncStorage.getItem(getStorageKey());
        const localNotes = stored ? (JSON.parse(stored) as Note[]) : [];
        
        if (notesQuery.data && notesQuery.data.length > 0) {
          // Use database data and deduplicate
          const deduplicated = deduplicateNotes(notesQuery.data);
          setNotes(deduplicated);
        } else if (notesQuery.isError && localNotes.length > 0) {
          // Only fallback to local storage if there's an error fetching from database
          const deduplicated = deduplicateNotes(localNotes);
          setNotes(deduplicated);
        } else if (notesQuery.isSuccess) {
          // Database query succeeded but returned empty, clear local state
          setNotes([]);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotes([]);
      }
    };

    if (notesQuery.isSuccess || notesQuery.isError) {
      loadFromLocalStorage();
    }
  }, [notesQuery.data, notesQuery.isSuccess, notesQuery.isError, user?.id]);

  // Clear notes when user changes
  useEffect(() => {
    if (!user?.id) {
      setNotes([]);
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
    if (user?.id) {
      await AsyncStorage.removeItem(getStorageKey());
    }
  };

  // Use the query data as the primary source of truth
  const currentNotes = notesQuery.data ? deduplicateNotes(notesQuery.data) : notes;

  return { 
    notes: currentNotes, 
    addNote, 
    updateNote, 
    deleteNote,
    clearAllNotes,
    isLoading: notesQuery.isLoading,
    error: notesQuery.error
  };
});