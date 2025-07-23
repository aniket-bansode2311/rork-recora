import { useState } from "react";
import { Alert, Platform } from "react-native";
import { Recording } from "@/types/recording";

interface TranscriptionResult {
  text: string;
  language: string;
}

interface SpeakerSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

interface SpeakerDiarizationResult {
  segments: SpeakerSegment[];
  speakers: string[];
  full_text: string;
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [isDiarizing, setIsDiarizing] = useState<string | null>(null);

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

  const transcribeWithSpeakers = async (recording: Recording): Promise<SpeakerDiarizationResult | null> => {
    setIsDiarizing(recording.id);

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

      // Add speaker diarization parameter
      formData.append('enable_speaker_diarization', 'true');

      // Use ElevenLabs API for speaker diarization
      const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const diarizationResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!diarizationResponse.ok) {
        // Fallback to regular transcription if speaker diarization fails
        console.warn('Speaker diarization failed, falling back to regular transcription');
        const regularTranscription = await transcribeAudio(recording);
        if (regularTranscription) {
          return {
            segments: [{
              speaker: 'Speaker A',
              text: regularTranscription,
              start_time: 0,
              end_time: recording.duration / 1000,
            }],
            speakers: ['Speaker A'],
            full_text: regularTranscription,
          };
        }
        throw new Error(`Speaker diarization failed: ${diarizationResponse.statusText}`);
      }

      const result = await diarizationResponse.json();
      
      // Process ElevenLabs response format
      if (result.segments && Array.isArray(result.segments)) {
        const speakers: string[] = [...new Set(result.segments.map((seg: any) => seg.speaker).filter((speaker: any): speaker is string => typeof speaker === 'string'))];
        const fullText = result.segments.map((seg: any) => `${seg.speaker}: ${seg.text}`).join('\n');
        
        return {
          segments: result.segments.map((seg: any) => ({
            speaker: seg.speaker || 'Unknown Speaker',
            text: seg.text || '',
            start_time: seg.start_time || 0,
            end_time: seg.end_time || 0,
          })),
          speakers,
          full_text: fullText,
        };
      } else {
        // If no speaker segments, treat as single speaker
        const text = result.text || result.transcript || '';
        return {
          segments: [{
            speaker: 'Speaker A',
            text,
            start_time: 0,
            end_time: recording.duration / 1000,
          }],
          speakers: ['Speaker A'],
          full_text: `Speaker A: ${text}`,
        };
      }

    } catch (error) {
      console.error('Speaker diarization error:', error);
      Alert.alert(
        "Speaker Diarization Error",
        "Failed to transcribe with speaker separation. Please try again or use regular transcription."
      );
      return null;
    } finally {
      setIsDiarizing(null);
    }
  };

  return {
    transcribeAudio,
    transcribeWithSpeakers,
    isTranscribing,
    isDiarizing
  };
}