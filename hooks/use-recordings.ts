import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './use-auth';
import { Recording } from '@/types/recording';

// Import tRPC only if available
let trpc: any = null;
try {
  trpc = require('@/lib/trpc').trpc;
} catch (error) {
  console.log('tRPC not available, using local storage only');
}

const RECORDINGS_STORAGE_KEY = 'audio_recordings';

export const useRecordings = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if we should use backend or local storage
  const useBackend = !!trpc && !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  // Create user-specific storage key
  const getUserStorageKey = () => {
    return user?.id ? `${RECORDINGS_STORAGE_KEY}_${user.id}` : RECORDINGS_STORAGE_KEY;
  };

  // Local storage functions
  const loadRecordingsFromStorage = async () => {
    try {
      const storageKey = getUserStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading recordings from storage:', error);
      return [];
    }
  };

  const saveRecordingsToStorage = async (newRecordings: Recording[]) => {
    try {
      const storageKey = getUserStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(newRecordings));
    } catch (error) {
      console.error('Error saving recordings to storage:', error);
    }
  };

  // Backend tRPC hooks (only if available)
  const recordingsQuery = useBackend && trpc ? trpc.recordings.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      onSuccess: (data: any) => {
        const mappedRecordings = data.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
        setRecordings(mappedRecordings);
        setIsLoading(false);
      },
      onError: (error: any) => {
        console.error('Error fetching recordings from backend:', error);
        // Fallback to local storage
        loadRecordingsFromStorage().then((localRecordings) => {
          setRecordings(localRecordings);
          setIsLoading(false);
        });
      }
    }
  ) : null;

  const createRecordingMutation = useBackend && trpc ? trpc.recordings.create.useMutation({
    onSuccess: (response: any) => {
      if (response.recording) {
        const newRecording = {
          ...response.recording,
          createdAt: new Date(response.recording.createdAt),
        };
        setRecordings(prev => [newRecording, ...prev]);
      }
    },
    onError: (error: any) => {
      console.error('Error creating recording on backend:', error);
      // The local version will be handled below
    }
  }) : null;

  // Load recordings
  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      
      if (useBackend && recordingsQuery) {
        // Backend will handle loading via query
        recordingsQuery.refetch();
      } else {
        // Use local storage
        const localRecordings = await loadRecordingsFromStorage();
        setRecordings(localRecordings);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      if (!useBackend || !recordingsQuery) {
        setIsLoading(false);
      }
    }
  };

  // Add new recording
  const addRecording = async (recording: Recording) => {
    try {
      // Always update local state immediately
      const newRecordings = [recording, ...recordings];
      setRecordings(newRecordings);

      if (useBackend && createRecordingMutation && user?.id) {
        // Try to save to backend
        await createRecordingMutation.mutateAsync({
          id: recording.id,
          uri: recording.uri,
          duration: recording.duration,
          title: recording.title,
          fileType: recording.fileType,
          transcription: recording.transcription,
          translatedTranscription: recording.translatedTranscription,
          detectedLanguage: recording.detectedLanguage,
          speakerSegments: recording.speakerSegments,
          speakers: recording.speakers,
          userId: user.id,
        });
      } else {
        // Save to local storage
        await saveRecordingsToStorage(newRecordings);
      }
    } catch (error) {
      console.error('Failed to add recording:', error);
      // Ensure local storage backup
      const newRecordings = [recording, ...recordings];
      await saveRecordingsToStorage(newRecordings);
    }
  };

  // Update existing recording
  const updateRecording = async (updatedRecording: Recording) => {
    try {
      const newRecordings = recordings.map(r => 
        r.id === updatedRecording.id ? updatedRecording : r
      );
      setRecordings(newRecordings);

      if (useBackend && trpc && user?.id) {
        const updateMutation = trpc.recordings.update.useMutation();
        await updateMutation.mutateAsync({
          id: updatedRecording.id,
          title: updatedRecording.title,
          transcription: updatedRecording.transcription,
          translatedTranscription: updatedRecording.translatedTranscription,
          detectedLanguage: updatedRecording.detectedLanguage,
          speakerSegments: updatedRecording.speakerSegments,
          speakers: updatedRecording.speakers,
          userId: user.id,
        });
      } else {
        await saveRecordingsToStorage(newRecordings);
      }
    } catch (error) {
      console.error('Failed to update recording:', error);
      // Ensure local storage backup
      const newRecordings = recordings.map(r => 
        r.id === updatedRecording.id ? updatedRecording : r
      );
      await saveRecordingsToStorage(newRecordings);
    }
  };

  // Delete recording
  const deleteRecording = async (id: string) => {
    try {
      const newRecordings = recordings.filter(r => r.id !== id);
      setRecordings(newRecordings);

      if (useBackend && trpc && user?.id) {
        const deleteMutation = trpc.recordings.delete.useMutation();
        await deleteMutation.mutateAsync({ id, userId: user.id });
      } else {
        await saveRecordingsToStorage(newRecordings);
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
      // Ensure local storage backup
      const newRecordings = recordings.filter(r => r.id !== id);
      await saveRecordingsToStorage(newRecordings);
    }
  };

  // Clear all recordings
  const clearAllRecordings = async () => {
    setRecordings([]);
    try {
      const storageKey = getUserStorageKey();
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing recordings:', error);
    }
  };

  // Load recordings when user changes
  useEffect(() => {
    if (user) {
      loadRecordings();
    } else {
      setRecordings([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    recordings,
    isLoading: isLoading || (useBackend && recordingsQuery?.isLoading),
    addRecording,
    updateRecording,
    deleteRecording,
    clearAllRecordings,
    refetch: loadRecordings,
  };
};