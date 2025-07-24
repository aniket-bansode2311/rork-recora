import { useState } from "react";
import { Alert, Platform } from "react-native";
import { Recording } from "@/types/recording";

interface TranscriptionResult {
  text: string;
  language: string;
}

interface TranslationResult {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
}

interface MultiLanguageTranscriptionResult {
  original_text: string;
  translated_text: string;
  detected_language: string;
  confidence: number;
}

interface SpeakerSegment {
  speaker: string;
  text: string;
  translated_text?: string;
  start_time: number;
  end_time: number;
  language?: string;
}

interface SpeakerDiarizationResult {
  segments: SpeakerSegment[];
  speakers: string[];
  full_text: string;
  translated_full_text?: string;
  detected_language?: string;
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [isDiarizing, setIsDiarizing] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

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

  const transcribeAndTranslateAudio = async (recording: Recording): Promise<MultiLanguageTranscriptionResult | null> => {
    setIsTranscribing(recording.id);
    setIsTranslating(recording.id);

    try {
      const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

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

      // Add parameters for multi-language support
      formData.append('model_id', 'eleven_multilingual_v2');
      formData.append('language', 'auto'); // Auto-detect language
      formData.append('response_format', 'json');

      // Use ElevenLabs Speech-to-Text API
      const transcriptionResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`ElevenLabs transcription failed: ${transcriptionResponse.statusText}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      const originalText = transcriptionResult.text || transcriptionResult.transcript || '';
      const detectedLanguage = transcriptionResult.language || 'unknown';
      const confidence = transcriptionResult.confidence || 0.8;

      // If the detected language is already English, return as is
      if (detectedLanguage.toLowerCase().includes('en') || detectedLanguage.toLowerCase() === 'english') {
        return {
          original_text: originalText,
          translated_text: originalText,
          detected_language: detectedLanguage,
          confidence
        };
      }

      // Translate to English using AI toolkit
      const translationResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the given text to English. Only return the translated text, nothing else. Maintain the original meaning and tone.'
            },
            {
              role: 'user',
              content: `Translate this ${detectedLanguage} text to English: "${originalText}"`
            }
          ]
        })
      });

      if (!translationResponse.ok) {
        console.warn('Translation failed, returning original text');
        return {
          original_text: originalText,
          translated_text: originalText,
          detected_language: detectedLanguage,
          confidence
        };
      }

      const translationResult = await translationResponse.json();
      const translatedText = translationResult.completion || originalText;

      return {
        original_text: originalText,
        translated_text: translatedText,
        detected_language: detectedLanguage,
        confidence
      };

    } catch (error) {
      console.error('Multi-language transcription error:', error);
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe and translate audio. Please try again."
      );
      return null;
    } finally {
      setIsTranscribing(null);
      setIsTranslating(null);
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

      // Use ElevenLabs API for speaker diarization with multi-language support
      const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      // Add multi-language parameters
      formData.append('model_id', 'eleven_multilingual_v2');
      formData.append('language', 'auto'); // Auto-detect language
      formData.append('response_format', 'json');

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
      const detectedLanguage = result.language || 'unknown';
      const isEnglish = detectedLanguage.toLowerCase().includes('en') || detectedLanguage.toLowerCase() === 'english';
      
      // Process ElevenLabs response format
      if (result.segments && Array.isArray(result.segments)) {
        const speakerList: string[] = result.segments
          .map((seg: any) => seg.speaker)
          .filter((speaker: any): speaker is string => typeof speaker === 'string' && speaker.length > 0);
        const speakers: string[] = [...new Set(speakerList)];
        
        let translatedSegments = result.segments;
        let translatedFullText = '';
        
        // Translate segments if not in English
        if (!isEnglish) {
          try {
            const segmentTexts = result.segments.map((seg: any) => seg.text || '').join(' ');
            
            const translationResponse = await fetch('https://toolkit.rork.com/text/llm/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: 'system',
                    content: 'You are a professional translator. Translate the given text to English while preserving speaker labels and formatting. Only return the translated text, nothing else.'
                  },
                  {
                    role: 'user',
                    content: `Translate this ${detectedLanguage} text to English: "${segmentTexts}"`
                  }
                ]
              })
            });
            
            if (translationResponse.ok) {
              const translationResult = await translationResponse.json();
              const translatedText = translationResult.completion || segmentTexts;
              
              // Split translated text back to segments (approximate)
              const translatedWords = translatedText.split(' ');
              const originalWords = segmentTexts.split(' ');
              const ratio = translatedWords.length / Math.max(originalWords.length, 1);
              
              translatedSegments = result.segments.map((seg: any, index: number) => {
                const segmentWordCount = (seg.text || '').split(' ').length;
                const startIndex = Math.floor(index * ratio * segmentWordCount);
                const endIndex = Math.floor((index + 1) * ratio * segmentWordCount);
                const segmentTranslation = translatedWords.slice(startIndex, endIndex).join(' ');
                
                return {
                  ...seg,
                  translated_text: segmentTranslation || seg.text,
                  language: detectedLanguage
                };
              });
              
              translatedFullText = translatedSegments.map((seg: any) => `${seg.speaker}: ${seg.translated_text || seg.text}`).join('\n');
            }
          } catch (translationError) {
            console.warn('Translation failed for segments:', translationError);
          }
        }
        
        const fullText = result.segments.map((seg: any) => `${seg.speaker}: ${seg.text}`).join('\n');
        
        return {
          segments: translatedSegments.map((seg: any) => ({
            speaker: seg.speaker || 'Unknown Speaker',
            text: seg.text || '',
            translated_text: seg.translated_text,
            start_time: seg.start_time || 0,
            end_time: seg.end_time || 0,
            language: seg.language
          })),
          speakers,
          full_text: fullText,
          translated_full_text: translatedFullText || fullText,
          detected_language: detectedLanguage
        };
      } else {
        // If no speaker segments, treat as single speaker
        const text = result.text || result.transcript || '';
        let translatedText = text;
        
        // Translate if not in English
        if (!isEnglish && text) {
          try {
            const translationResponse = await fetch('https://toolkit.rork.com/text/llm/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: 'system',
                    content: 'You are a professional translator. Translate the given text to English. Only return the translated text, nothing else.'
                  },
                  {
                    role: 'user',
                    content: `Translate this ${detectedLanguage} text to English: "${text}"`
                  }
                ]
              })
            });
            
            if (translationResponse.ok) {
              const translationResult = await translationResponse.json();
              translatedText = translationResult.completion || text;
            }
          } catch (translationError) {
            console.warn('Translation failed:', translationError);
          }
        }
        
        return {
          segments: [{
            speaker: 'Speaker A',
            text,
            translated_text: translatedText,
            start_time: 0,
            end_time: recording.duration / 1000,
            language: detectedLanguage
          }],
          speakers: ['Speaker A'],
          full_text: `Speaker A: ${text}`,
          translated_full_text: `Speaker A: ${translatedText}`,
          detected_language: detectedLanguage
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
    transcribeAndTranslateAudio,
    transcribeWithSpeakers,
    isTranscribing,
    isDiarizing,
    isTranslating
  };
}