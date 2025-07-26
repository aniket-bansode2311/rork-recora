import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Recording } from "@/types/recording";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export const [RecordingsProvider, useRecordings] = createContextHook(() => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getStorageKey = () => {
    return user ? `audio_recordings_${user.id}` : "audio_recordings_guest";
  };

  // Helper function to deduplicate recordings by ID
  const deduplicateRecordings = (recordingsList: Recording[]): Recording[] => {
    const seen = new Set<string>();
    return recordingsList.filter(recording => {
      if (seen.has(recording.id)) {
        return false;
      }
      seen.add(recording.id);
      return true;
    });
  };

  // Fetch recordings from database with local storage fallback
  const recordingsQuery = trpc.recordings.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      retry: 2,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  // Create recording mutation
  const createMutation = trpc.recordings.create.useMutation({
    onSuccess: (data, variables) => {
      console.log('CREATE_MUTATION_SUCCESS: Recording saved to database successfully:', {
        recordingId: data.recording.id,
        title: data.recording.title,
        userId: variables.userId
      });
      
      // Invalidate and refetch recordings
      queryClient.invalidateQueries({ queryKey: [['recordings', 'list']] });
    },
    onError: async (error, variables) => {
      console.error('CREATE_MUTATION_ERROR: Failed to save recording to database:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        recordingId: variables.id,
        userId: variables.userId,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback to local storage
      try {
        console.log('CREATE_MUTATION_ERROR: Attempting local storage fallback...');
        const currentRecordings = recordings;
        const newRecording: Recording = {
          id: variables.id,
          uri: variables.uri,
          duration: variables.duration,
          title: variables.title,
          createdAt: new Date(),
          fileType: variables.fileType,
          transcription: variables.transcription,
          speakerSegments: variables.speakerSegments,
          speakers: variables.speakers,
        };
        const updated = deduplicateRecordings([newRecording, ...currentRecordings]);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updated));
        setRecordings(updated);
        console.log('CREATE_MUTATION_ERROR: Local storage fallback successful, count:', updated.length);
      } catch (storageError) {
        console.error('CREATE_MUTATION_ERROR: Local storage fallback also failed:', {
          storageError: storageError instanceof Error ? storageError.message : 'Unknown error',
          recordingId: variables.id
        });
      }
    }
  });

  // Update recording mutation
  const updateMutation = trpc.recordings.update.useMutation({
    onSuccess: () => {
      // Invalidate and refetch recordings
      queryClient.invalidateQueries({ queryKey: [['recordings', 'list']] });
    },
    onError: async (error, variables) => {
      console.warn("Failed to update recording in database, saving locally:", error);
      
      // Fallback to local storage
      try {
        const updated = recordings.map(recording => 
          recording.id === variables.id 
            ? { 
                ...recording, 
                transcription: variables.transcription || recording.transcription, 
                title: variables.title || recording.title,
                speakerSegments: variables.speakerSegments || recording.speakerSegments,
                speakers: variables.speakers || recording.speakers,
              }
            : recording
        );
        const deduplicated = deduplicateRecordings(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setRecordings(deduplicated);
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
      }
    }
  });

  // Delete recording mutation
  const deleteMutation = trpc.recordings.delete.useMutation({
    onSuccess: () => {
      // Invalidate and refetch recordings
      queryClient.invalidateQueries({ queryKey: [['recordings', 'list']] });
    },
    onError: async (error, variables) => {
      console.warn("Failed to delete recording from database, removing locally:", error);
      
      // Fallback to local storage
      try {
        const updated = recordings.filter(recording => recording.id !== variables.id);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updated));
        setRecordings(updated);
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
        const localRecordings = stored ? (JSON.parse(stored) as Recording[]) : [];
        
        if (recordingsQuery.data && recordingsQuery.data.length > 0) {
          // Use database data and deduplicate
          const deduplicated = deduplicateRecordings(recordingsQuery.data);
          setRecordings(deduplicated);
        } else if (recordingsQuery.isError && localRecordings.length > 0) {
          // Only fallback to local storage if there's an error fetching from database
          const deduplicated = deduplicateRecordings(localRecordings);
          setRecordings(deduplicated);
        } else if (recordingsQuery.isSuccess) {
          // Database query succeeded but returned empty, clear local state
          setRecordings([]);
        }
      } catch (error) {
        console.error("Error loading recordings:", error);
        setRecordings([]);
      }
    };

    if (recordingsQuery.isSuccess || recordingsQuery.isError) {
      loadFromLocalStorage();
    }
  }, [recordingsQuery.data, recordingsQuery.isSuccess, recordingsQuery.isError, user?.id]);

  // Clear recordings when user changes
  useEffect(() => {
    if (!user?.id) {
      setRecordings([]);
    }
  }, [user?.id]);

  const addRecording = (recording: Recording) => {
    console.log('ADD_RECORDING: Starting addRecording process...');
    
    if (!user?.id) {
      console.error('ADD_RECORDING_ERROR: User not authenticated', { 
        user: user ? { id: user.id, email: user.email } : null,
        isAuthenticated: !!user?.id
      });
      throw new Error('User not authenticated - cannot save recording');
    }
    
    console.log('ADD_RECORDING: User authenticated, preparing mutation data:', {
      recordingId: recording.id,
      uri: recording.uri,
      duration: recording.duration,
      title: recording.title,
      fileType: recording.fileType,
      userId: user.id,
      userEmail: user.email,
      hasTranscription: !!recording.transcription,
      hasSpeakerSegments: !!recording.speakerSegments,
      hasSpeakers: !!recording.speakers
    });
    
    try {
      console.log('ADD_RECORDING: Calling createMutation.mutate...');
      createMutation.mutate({
        id: recording.id,
        uri: recording.uri,
        duration: recording.duration,
        title: recording.title,
        fileType: recording.fileType,
        transcription: recording.transcription,
        speakerSegments: recording.speakerSegments,
        speakers: recording.speakers,
        userId: user.id,
      });
      console.log('ADD_RECORDING: Mutation called successfully');
    } catch (mutationError) {
      console.error('ADD_RECORDING_ERROR: Failed to call mutation:', {
        error: mutationError instanceof Error ? mutationError.message : 'Unknown error',
        stack: mutationError instanceof Error ? mutationError.stack : undefined,
        recordingId: recording.id
      });
      throw mutationError;
    }
  };

  const deleteRecording = (id: string) => {
    if (!user?.id) {
      console.warn("Cannot delete recording: user not authenticated");
      return;
    }
    
    deleteMutation.mutate({ id, userId: user.id });
  };

  const updateRecording = (updatedRecording: Recording) => {
    if (!user?.id) {
      console.warn("Cannot update recording: user not authenticated");
      return;
    }
    
    updateMutation.mutate({
      id: updatedRecording.id,
      transcription: updatedRecording.transcription,
      title: updatedRecording.title,
      speakerSegments: updatedRecording.speakerSegments,
      speakers: updatedRecording.speakers,
      userId: user.id,
    });
  };

  const clearAllRecordings = async () => {
    try {
      console.log('CLEAR_ALL_RECORDINGS: Starting clear all process...');
      
      if (!user?.id) {
        console.warn('CLEAR_ALL_RECORDINGS: User not authenticated');
        return;
      }

      // Clear local state immediately for better UX
      setRecordings([]);
      
      // Clear local storage
      await AsyncStorage.removeItem(getStorageKey());
      console.log('CLEAR_ALL_RECORDINGS: Local storage cleared');
      
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [['recordings', 'list']] });
      console.log('CLEAR_ALL_RECORDINGS: Queries invalidated');
      
      // Note: In a real app, you might want to call a backend endpoint to clear all recordings
      // For now, we're just clearing the local data
      
    } catch (error) {
      console.error('CLEAR_ALL_RECORDINGS_ERROR: Failed to clear recordings:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user?.id
      });
      throw error;
    }
  };

  // Use the query data as the primary source of truth
  const currentRecordings = recordingsQuery.data ? deduplicateRecordings(recordingsQuery.data) : recordings;

  // Debug logging for data flow
  console.log('USE_RECORDINGS_HOOK: Current state:', {
    queryData: recordingsQuery.data?.length || 0,
    localRecordings: recordings.length,
    currentRecordings: currentRecordings.length,
    isLoading: recordingsQuery.isLoading,
    isError: recordingsQuery.isError,
    hasUser: !!user?.id,
    userId: user?.id
  });

  return { 
    recordings: currentRecordings, 
    addRecording, 
    deleteRecording, 
    updateRecording,
    clearAllRecordings,
    isLoading: recordingsQuery.isLoading,
    error: recordingsQuery.error,
    recordingsCount: currentRecordings.length
  };
});