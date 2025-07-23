import { useState } from "react";
import { Alert, Platform } from "react-native";
import { Recording } from "@/types/recording";

interface TranscriptionResult {
  text: string;
  language: string;
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);

  const transcribeAudio = async (recording: Recording): Promise<string | null> => {
    setIsTranscribing(recording.id);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // For web, we need to fetch the audio file first
        const response = await fetch(recording.uri);
        const blob = await response.blob();
        const file = new File([blob], `recording.${recording.fileType}`, {
          type: `audio/${recording.fileType}`
        });
        formData.append('audio', file);
      } else {
        // For mobile platforms
        const audioFile = {
          uri: recording.uri,
          name: `recording.${recording.fileType}`,
          type: `audio/${recording.fileType}`
        } as any;
        formData.append('audio', audioFile);
      }

      const transcriptionResponse = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptionResponse.statusText}`);
      }

      const result: TranscriptionResult = await transcriptionResponse.json();
      return result.text;

    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio. Please try again."
      );
      return null;
    } finally {
      setIsTranscribing(null);
    }
  };

  return {
    transcribeAudio,
    isTranscribing
  };
}