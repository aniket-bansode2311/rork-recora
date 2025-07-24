import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './use-auth';
import { Recording } from '@/types/recording';

const RECORDINGS_STORAGE_KEY = 'audio_recordings';

export const useRecordings = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user-specific storage key
  const getUserStorageKey = () => {
    return user?.id ? `${RECORDINGS_STORAGE_KEY}_${user.id}` : RECORDINGS_STORAGE_KEY;
  };

  // Load recordings from AsyncStorage
  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const storageKey = getUserStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const parsedRecordings = JSON.parse(stored).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
        // Sort by creation date (newest first)
        const sortedRecordings = parsedRecordings.sort((a: Recording, b: Recording) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
        setRecordings(sortedRecordings);
      } else {
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save recordings to AsyncStorage
  const saveRecordings = async (newRecordings: Recording[]) => {
    try {
      const storageKey = getUserStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(newRecordings));
    } catch (error) {
      console.error('Error saving recordings:', error);
    }
  };

  // Add new recording
  const addRecording = async (recording: Recording) => {
    try {
      console.log('Adding recording:', recording.id, recording.title);
      
      // Add to the beginning of the array (newest first)
      const newRecordings = [recording, ...recordings];
      setRecordings(newRecordings);
      await saveRecordings(newRecordings);
      
      console.log('Recording added successfully. Total recordings:', newRecordings.length);
    } catch (error) {
      console.error('Failed to add recording:', error);
    }
  };

  // Update existing recording
  const updateRecording = async (updatedRecording: Recording) => {
    try {
      console.log('Updating recording:', updatedRecording.id);
      
      const newRecordings = recordings.map(r => 
        r.id === updatedRecording.id ? { ...updatedRecording, createdAt: r.createdAt } : r
      );
      setRecordings(newRecordings);
      await saveRecordings(newRecordings);
      
      console.log('Recording updated successfully');
    } catch (error) {
      console.error('Failed to update recording:', error);
    }
  };

  // Delete recording
  const deleteRecording = async (id: string) => {
    try {
      console.log('Deleting recording:', id);
      
      const newRecordings = recordings.filter(r => r.id !== id);
      setRecordings(newRecordings);
      await saveRecordings(newRecordings);
      
      console.log('Recording deleted successfully. Remaining recordings:', newRecordings.length);
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  // Clear all recordings
  const clearAllRecordings = async () => {
    try {
      console.log('Clearing all recordings for user:', user?.id);
      
      setRecordings([]);
      const storageKey = getUserStorageKey();
      await AsyncStorage.removeItem(storageKey);
      
      console.log('All recordings cleared successfully');
    } catch (error) {
      console.error('Error clearing recordings:', error);
    }
  };

  // Load recordings when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('Loading recordings for user:', user.id);
      loadRecordings();
    } else {
      console.log('No user, clearing recordings');
      setRecordings([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    recordings,
    isLoading,
    addRecording,
    updateRecording,
    deleteRecording,
    clearAllRecordings,
    refetch: loadRecordings,
  };
};