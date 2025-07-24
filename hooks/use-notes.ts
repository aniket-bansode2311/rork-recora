import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './use-auth';
import { Note } from '@/types/note';

const NOTES_STORAGE_KEY = 'audio_notes';

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user-specific storage key
  const getUserStorageKey = () => {
    return user?.id ? `${NOTES_STORAGE_KEY}_${user.id}` : NOTES_STORAGE_KEY;
  };

  // Load notes from AsyncStorage
  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const storageKey = getUserStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const parsedNotes = JSON.parse(stored).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        }));
        // Sort by updated date (most recently updated first)
        const sortedNotes = parsedNotes.sort((a: Note, b: Note) => 
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
        setNotes(sortedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save notes to AsyncStorage
  const saveNotes = async (newNotes: Note[]) => {
    try {
      const storageKey = getUserStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(newNotes));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Create new note
  const createNote = async (noteData: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<Note | null> => {
    try {
      console.log('Creating note:', noteData.title);
      
      const newNote: Note = {
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add to the beginning of the array (newest first)
      const newNotes = [newNote, ...notes];
      setNotes(newNotes);
      await saveNotes(newNotes);
      
      console.log('Note created successfully. Total notes:', newNotes.length);
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      return null;
    }
  };

  // Update existing note
  const updateNote = async (updatedNote: Note) => {
    try {
      console.log('Updating note:', updatedNote.id);
      
      const noteWithUpdatedTime = {
        ...updatedNote,
        updatedAt: new Date(),
      };
      
      const newNotes = notes.map(n => 
        n.id === updatedNote.id ? noteWithUpdatedTime : n
      );
      
      // Re-sort to move updated note to top
      const sortedNotes = newNotes.sort((a: Note, b: Note) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
      
      setNotes(sortedNotes);
      await saveNotes(sortedNotes);
      
      console.log('Note updated successfully');
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  // Delete note
  const deleteNote = async (id: string) => {
    try {
      console.log('Deleting note:', id);
      
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      await saveNotes(newNotes);
      
      console.log('Note deleted successfully. Remaining notes:', newNotes.length);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Clear all notes
  const clearAllNotes = async () => {
    try {
      console.log('Clearing all notes for user:', user?.id);
      
      setNotes([]);
      const storageKey = getUserStorageKey();
      await AsyncStorage.removeItem(storageKey);
      
      console.log('All notes cleared successfully');
    } catch (error) {
      console.error('Error clearing notes:', error);
    }
  };

  // Load notes when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('Loading notes for user:', user.id);
      loadNotes();
    } else {
      console.log('No user, clearing notes');
      setNotes([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    clearAllNotes,
    refetch: loadNotes,
  };
};