import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { trpc } from '@/lib/trpc';
import { Note } from '@/types/note';

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // tRPC queries and mutations
  const notesQuery = trpc.notes.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      onSuccess: (data) => {
        setNotes(data.map(mapDbNoteToNote));
        setIsLoading(false);
      },
      onError: (error) => {
        console.error('Error fetching notes:', error);
        setIsLoading(false);
      }
    }
  );

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: (response) => {
      if (response.note) {
        const newNote = mapDbNoteToNote(response.note);
        setNotes(prev => [newNote, ...prev]);
      }
    },
    onError: (error) => {
      console.error('Error creating note:', error);
    }
  });

  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: (response) => {
      if (response.note) {
        setNotes(prev => 
          prev.map(note => 
            note.id === response.note.id 
              ? { ...note, ...response.note }
              : note
          )
        );
      }
    },
    onError: (error) => {
      console.error('Error updating note:', error);
    }
  });

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: (response) => {
      if (response.deletedId) {
        setNotes(prev => prev.filter(n => n.id !== response.deletedId));
      }
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
    }
  });

  // Helper function to map database note to app note
  const mapDbNoteToNote = (dbNote: any): Note => ({
    id: dbNote.id,
    title: dbNote.title,
    content: dbNote.content,
    originalTranscription: dbNote.originalTranscription,
    recordingId: dbNote.recordingId,
    recordingTitle: dbNote.recordingTitle,
    summary: dbNote.summary,
    keyPoints: dbNote.keyPoints,
    createdAt: dbNote.createdAt,
    updatedAt: dbNote.updatedAt,
  });

  const createNote = async (note: Omit<Note, 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      console.error('No user ID available');
      return null;
    }

    try {
      const response = await createNoteMutation.mutateAsync({
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
      return response.note ? mapDbNoteToNote(response.note) : null;
    } catch (error) {
      console.error('Failed to create note:', error);
      return null;
    }
  };

  const updateNote = async (note: Note) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        title: note.title,
        content: note.content,
        summary: note.summary,
        keyPoints: note.keyPoints,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      await deleteNoteMutation.mutateAsync({
        id,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const clearAllNotes = async () => {
    setNotes([]);
  };

  // Refetch notes when user changes
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      notesQuery.refetch();
    } else {
      setNotes([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    notes,
    isLoading: isLoading || notesQuery.isLoading,
    createNote,
    updateNote,
    deleteNote,
    clearAllNotes,
    refetch: notesQuery.refetch,
  };
};