import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { Recording } from "@/types/recording";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export const [RecordingsProvider, useRecordings] = createContextHook(() => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
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

  // Count unsynced recordings
  const countUnsyncedRecordings = (recordingsList: Recording[]): number => {
    return recordingsList.filter(recording => recording.isSynced === false).length;
  };

  // Fetch recordings from database with local storage fallback
  const recordingsQuery = trpc.recordings.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Handle query errors
  useEffect(() => {
    if (recordingsQuery.error) {
      console.error("Failed to fetch recordings from database:", recordingsQuery.error);
      Alert.alert(
        "Connection Error", 
        "Failed to load recordings from server. Showing offline data."
      );
    }
  }, [recordingsQuery.error]);

  // Create recording mutation
  const createMutation = trpc.recordings.create.useMutation({
    onMutate: async (newRecording) => {
      await queryClient.cancelQueries({ queryKey: [['recordings', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousRecordings = queryClient.getQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }]);
      
      const optimisticRecording: Recording = {
        id: newRecording.id,
        uri: newRecording.uri,
        duration: newRecording.duration,
        title: newRecording.title,
        createdAt: new Date(),
        fileType: newRecording.fileType,
        transcription: newRecording.transcription,
        isSynced: true,
      };
      
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        const oldData = old || [];
        return deduplicateRecordings([optimisticRecording, ...oldData]);
      });
      
      return { previousRecordings, optimisticRecording };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        const oldData = old || [];
        return deduplicateRecordings(oldData.map((r: Recording) => r.id === variables.id ? {
          id: data.recording.id,
          uri: data.recording.uri,
          duration: data.recording.duration,
          title: data.recording.title,
          createdAt: data.recording.createdAt,
          fileType: data.recording.fileType,
          transcription: data.recording.transcription,
          isSynced: true,
        } : r));
      });
    },
    onError: async (error: any, variables, context) => {
      console.warn("Failed to save recording to database, saving locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to save recording to server. It has been saved locally and will sync when connection is restored."
      );
      
      if (context?.previousRecordings) {
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
      try {
        const currentRecordings = recordings;
        const newRecording: Recording = {
          id: variables.id,
          uri: variables.uri,
          duration: variables.duration,
          title: variables.title,
          createdAt: new Date(),
          fileType: variables.fileType,
          transcription: variables.transcription,
          isSynced: false, // Mark as unsynced
        };
        const updated = deduplicateRecordings([newRecording, ...currentRecordings]);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updated));
        setRecordings(updated);
        setUnsyncedCount(countUnsyncedRecordings(updated));
      } catch (storageError) {
        console.error("Failed to save to local storage:", storageError);
        Alert.alert("Error", "Failed to save recording. Please try again.");
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
        return oldData.map((recording: Recording) => 
          recording.id === updatedRecording.id 
            ? { 
                ...recording, 
                transcription: updatedRecording.transcription, 
                title: updatedRecording.title || recording.title,
                isSynced: true,
              }
            : recording
        );
      });
      
      return { previousRecordings };
    },
    onSuccess: () => {
      // Data is already optimistically updated
    },
    onError: async (error: any, variables, context) => {
      console.warn("Failed to update recording in database, saving locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to update recording on server. Changes saved locally and will sync when connection is restored."
      );
      
      if (context?.previousRecordings) {
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
      try {
        const updated = recordings.map(recording => 
          recording.id === variables.id 
            ? { 
                ...recording, 
                transcription: variables.transcription, 
                title: variables.title || recording.title,
                isSynced: false, // Mark as unsynced
              }
            : recording
        );
        const deduplicated = deduplicateRecordings(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setRecordings(deduplicated);
        setUnsyncedCount(countUnsyncedRecordings(deduplicated));
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
        Alert.alert("Error", "Failed to save changes. Please try again.");
      }
    }
  });

  // Delete recording mutation
  const deleteMutation = trpc.recordings.delete.useMutation({
    onMutate: async (deleteVars) => {
      await queryClient.cancelQueries({ queryKey: [['recordings', 'list'], { input: { userId: user?.id || '' } }] });
      
      const previousRecordings = queryClient.getQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }]);
      
      queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], (old: Recording[] | undefined) => {
        return (old || []).filter((recording: Recording) => recording.id !== deleteVars.id);
      });
      
      return { previousRecordings };
    },
    onError: async (error: any, variables, context) => {
      console.warn("Failed to delete recording from database, removing locally:", error);
      
      Alert.alert(
        "Sync Error",
        "Failed to delete recording from server. It has been removed locally and will sync when connection is restored."
      );
      
      if (context?.previousRecordings) {
        queryClient.setQueryData([['recordings', 'list'], { input: { userId: user?.id || '' } }], context.previousRecordings);
      }
      
      try {
        const updated = recordings.filter(recording => recording.id !== variables.id);
        const deduplicated = deduplicateRecordings(updated);
        await AsyncStorage.setItem(getStorageKey(), JSON.stringify(deduplicated));
        setRecordings(deduplicated);
        setUnsyncedCount(countUnsyncedRecordings(deduplicated));
      } catch (storageError) {
        console.error("Failed to update local storage:", storageError);
        Alert.alert("Error", "Failed to delete recording. Please try again.");
      }
    }
  });

  // Sync unsynced recordings to database
  const syncUnsyncedRecordings = async () => {
    if (!user?.id || isSyncing) return;
    
    const unsyncedRecordings = recordings.filter(recording => recording.isSynced === false);
    if (unsyncedRecordings.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      for (const recording of unsyncedRecordings) {
        try {
          await createMutation.mutateAsync({
            id: recording.id,
            uri: recording.uri,
            duration: recording.duration,
            title: recording.title,
            fileType: recording.fileType,
            transcription: recording.transcription,
            userId: user.id,
          });
          
          // Mark as synced in local storage
          const updatedRecordings = recordings.map(r => 
            r.id === recording.id ? { ...r, isSynced: true } : r
          );
          setRecordings(updatedRecordings);
          await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updatedRecordings));
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync recording ${recording.id}:`, error);
        }
      }

      if (syncedCount > 0) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${syncedCount} recording${syncedCount !== 1 ? 's' : ''} to server.`
        );
        setUnsyncedCount(countUnsyncedRecordings(recordings));
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
        const localRecordings = stored ? (JSON.parse(stored) as Recording[]) : [];
        
        if (recordingsQuery.data && recordingsQuery.data.length > 0) {
          // Merge server data with local unsynced data
          const serverRecordings = recordingsQuery.data.map((recording: any) => ({ ...recording, isSynced: true }));
          const unsyncedLocal = localRecordings.filter(recording => recording.isSynced === false);
          const merged = deduplicateRecordings([...unsyncedLocal, ...serverRecordings]);
          setRecordings(merged);
          setUnsyncedCount(countUnsyncedRecordings(merged));
        } else if (recordingsQuery.isError && localRecordings.length > 0) {
          const deduplicated = deduplicateRecordings(localRecordings);
          setRecordings(deduplicated);
          setUnsyncedCount(countUnsyncedRecordings(deduplicated));
        } else if (recordingsQuery.isSuccess) {
          setRecordings([]);
          setUnsyncedCount(0);
        }
      } catch (error) {
        console.error("Error loading recordings:", error);
        setRecordings([]);
        setUnsyncedCount(0);
      }
    };

    if (recordingsQuery.isSuccess || recordingsQuery.isError) {
      loadFromLocalStorage();
    }
  }, [recordingsQuery.data, recordingsQuery.isSuccess, recordingsQuery.isError, user?.id]);

  // Auto-sync when user is authenticated and has unsynced data
  useEffect(() => {
    if (user?.id && unsyncedCount > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        syncUnsyncedRecordings();
      }, 2000); // Wait 2 seconds after load to attempt sync

      return () => clearTimeout(timer);
    }
  }, [user?.id, unsyncedCount]);

  // Clear recordings when user changes
  useEffect(() => {
    if (!user?.id) {
      setRecordings([]);
      setUnsyncedCount(0);
    }
  }, [user?.id]);

  const addRecording = (recording: Recording) => {
    if (!user?.id) {
      console.warn("Cannot add recording: user not authenticated");
      return;
    }
    
    createMutation.mutate({
      id: recording.id,
      uri: recording.uri,
      duration: recording.duration,
      title: recording.title,
      fileType: recording.fileType,
      transcription: recording.transcription,
      userId: user.id,
    });
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
      userId: user.id,
    });
  };

  const clearAllRecordings = async () => {
    setRecordings([]);
    setUnsyncedCount(0);
    if (user?.id) {
      await AsyncStorage.removeItem(getStorageKey());
    }
  };

  const currentRecordings = recordingsQuery.data ? deduplicateRecordings(recordingsQuery.data) : recordings;

  return { 
    recordings: currentRecordings, 
    addRecording, 
    deleteRecording, 
    updateRecording,
    clearAllRecordings,
    syncUnsyncedRecordings,
    isLoading: recordingsQuery.isLoading,
    isSyncing,
    unsyncedCount,
    error: recordingsQuery.error
  };
});