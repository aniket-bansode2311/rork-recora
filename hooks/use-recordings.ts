import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { trpc } from '@/lib/trpc';
import { Recording } from '@/types/recording';

export const useRecordings = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // tRPC queries and mutations
  const recordingsQuery = trpc.recordings.list.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      onSuccess: (data) => {
        setRecordings(data.map(mapDbRecordingToRecording));
        setIsLoading(false);
      },
      onError: (error) => {
        console.error('Error fetching recordings:', error);
        setIsLoading(false);
      }
    }
  );

  const createRecordingMutation = trpc.recordings.create.useMutation({
    onSuccess: (response) => {
      if (response.recording) {
        const newRecording = mapDbRecordingToRecording(response.recording);
        setRecordings(prev => [newRecording, ...prev]);
      }
    },
    onError: (error) => {
      console.error('Error creating recording:', error);
    }
  });

  const updateRecordingMutation = trpc.recordings.update.useMutation({
    onSuccess: (response) => {
      if (response.recording) {
        setRecordings(prev => 
          prev.map(recording => 
            recording.id === response.recording.id 
              ? { ...recording, ...response.recording }
              : recording
          )
        );
      }
    },
    onError: (error) => {
      console.error('Error updating recording:', error);
    }
  });

  const deleteRecordingMutation = trpc.recordings.delete.useMutation({
    onSuccess: (response) => {
      if (response.deletedId) {
        setRecordings(prev => prev.filter(r => r.id !== response.deletedId));
      }
    },
    onError: (error) => {
      console.error('Error deleting recording:', error);
    }
  });

  // Helper function to map database recording to app recording
  const mapDbRecordingToRecording = (dbRecording: any): Recording => ({
    id: dbRecording.id,
    uri: dbRecording.uri,
    duration: dbRecording.duration,
    title: dbRecording.title,
    fileType: dbRecording.fileType,
    transcription: dbRecording.transcription,
    translatedTranscription: dbRecording.translatedTranscription,
    detectedLanguage: dbRecording.detectedLanguage,
    speakerSegments: dbRecording.speakerSegments,
    speakers: dbRecording.speakers,
    createdAt: dbRecording.createdAt,
  });

  const addRecording = async (recording: Recording) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
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
    } catch (error) {
      console.error('Failed to add recording:', error);
      // Optionally show user-friendly error message
    }
  };

  const updateRecording = async (recording: Recording) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      await updateRecordingMutation.mutateAsync({
        id: recording.id,
        title: recording.title,
        transcription: recording.transcription,
        translatedTranscription: recording.translatedTranscription,
        detectedLanguage: recording.detectedLanguage,
        speakerSegments: recording.speakerSegments,
        speakers: recording.speakers,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to update recording:', error);
    }
  };

  const deleteRecording = async (id: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      await deleteRecordingMutation.mutateAsync({
        id,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const clearAllRecordings = async () => {
    setRecordings([]);
  };

  // Refetch recordings when user changes
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      recordingsQuery.refetch();
    } else {
      setRecordings([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    recordings,
    isLoading: isLoading || recordingsQuery.isLoading,
    addRecording,
    updateRecording,
    deleteRecording,
    clearAllRecordings,
    refetch: recordingsQuery.refetch,
  };
};