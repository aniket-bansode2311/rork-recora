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
    onMutate: async (newRecording) => {
      console.log('CREATE_MUTATION_MUTATE: Starting optimistic update...', {
        recordingId: newRecording.id,
        userId: newRecording.userId
      });
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [['recordings', 'list'], { input: { userId: user?.id || '' } }] });
      
      // Snapshot previous value
      const previousRecordings = queryClient.getQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }]);
      console.log('CREATE_MUTATION_MUTATE: Previous recordings count:', Array.isArray(previousRecordings) ? previousRecordings.length : 0);
      
      // Optimistically update
      const optimisticRecording: Recording = {
        id: newRecording.id,
        uri: newRecording.uri,
        duration: newRecording.duration,
        title: newRecording.title,
        createdAt: new Date(),
        fileType: newRecording.fileType,
        transcription: newRecording.transcription,
        speakerSegments: newRecording.speakerSegments,
        speakers: newRecording.speakers,
      };
      
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        const oldData = old || [];
        const updated = deduplicateRecordings([optimisticRecording, ...oldData]);
        console.log('CREATE_MUTATION_MUTATE: Optimistic update applied, new count:', updated.length);
        return updated;
      });
      
      console.log('CREATE_MUTATION_MUTATE: Optimistic update completed');
      return { previousRecordings, optimisticRecording };
    },
    onSuccess: (data, variables, context) => {
      console.log('CREATE_MUTATION_SUCCESS: Recording saved to database successfully:', {
        recordingId: data.recording.id,
        title: data.recording.title,
        userId: variables.userId
      });
      
      // Update with server data
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        const oldData = old || [];
        const updated = deduplicateRecordings(oldData.map(r => r.id === variables.id ? {
          id: data.recording.id,
          uri: data.recording.uri,
          duration: data.recording.duration,
          title: data.recording.title,
          createdAt: data.recording.createdAt,
          fileType: data.recording.fileType,
          transcription: data.recording.transcription,
          speakerSegments: data.recording.speakerSegments,
          speakers: data.recording.speakers,
        } : r));
        console.log('CREATE_MUTATION_SUCCESS: Server data applied, final count:', updated.length);
        return updated;
      });
    },
    onError: async (error, variables, context) => {
      console.error('CREATE_MUTATION_ERROR: Failed to save recording to database:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        recordingId: variables.id,
        userId: variables.userId,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Revert optimistic update
      if (context?.previousRecordings) {
        console.log('CREATE_MUTATION_ERROR: Reverting optimistic update...');
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
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
    onMutate: async (updatedRecording) => {
      await queryClient.cancelQueries({ queryKey: [['recordings', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousRecordings = queryClient.getQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }]);
      
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        const oldData = old || [];
        return oldData.map(recording => 
          recording.id === updatedRecording.id 
            ? { 
                ...recording, 
                transcription: updatedRecording.transcription || recording.transcription, 
                title: updatedRecording.title || recording.title,
                speakerSegments: updatedRecording.speakerSegments || recording.speakerSegments,
                speakers: updatedRecording.speakers || recording.speakers,
              }
            : recording
        );
      });
      
      return { previousRecordings };
    },
    onSuccess: () => {
      // Data is already optimistically updated, no need to refetch
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to update recording in database, saving locally:", error);
      
      // Revert optimistic update
      if (context?.previousRecordings) {
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
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
    onMutate: async (deleteVars) => {
      await queryClient.cancelQueries({ queryKey: [['recordings', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousRecordings = queryClient.getQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }]);
      
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        return (old || []).filter(recording => recording.id !== deleteVars.id);
      });
      
      return { previousRecordings };
    },
    onError: async (error, variables, context) => {
      console.warn("Failed to delete recording from database, removing locally:", error);
      
      // Revert optimistic update
      if (context?.previousRecordings) {
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
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
    setRecordings([]);
    if (user?.id) {
      await AsyncStorage.removeItem(getStorageKey());
    }
  };

  // Use the query data as the primary source of truth
  const currentRecordings = recordingsQuery.data ? deduplicateRecordings(recordingsQuery.data) : recordings;

  return { 
    recordings: currentRecordings, 
    addRecording, 
    deleteRecording, 
    updateRecording,
    clearAllRecordings,
    isLoading: recordingsQuery.isLoading,
    error: recordingsQuery.error
  };
});