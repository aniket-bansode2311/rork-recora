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

// Retry utility function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit or system busy error
      const isRetryableError = 
        error.message?.includes('system_busy') ||
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('heavy traffic');
      
      // Don't retry on non-retryable errors or on last attempt
      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

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
      // Try multiple ways to get the API key
      let apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      
      // Fallback: try without EXPO_PUBLIC prefix (in case of env loading issues)
      if (!apiKey) {
        apiKey = process.env.ELEVENLABS_API_KEY;
      }
      
      // Temporary hardcoded fallback for testing (remove in production)
      if (!apiKey) {
        apiKey = 'sk_577788b6902027d187ced93cc2ac667c8d379397cb139e1f';
        console.warn('Using hardcoded API key - this should be fixed in production');
      }
      
      console.log('DEBUG: ElevenLabs API key check:', {
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPrefix: apiKey?.substring(0, 8) || 'none',
        envVars: Object.keys(process.env).filter(key => key.includes('ELEVEN'))
      });
      
      if (!apiKey) {
        console.error('ERROR: ElevenLabs API key not found in environment variables');
        console.error('Available env vars:', Object.keys(process.env));
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
        formData.append('file', file);
      } else {
        // For mobile platforms
        const audioFile = {
          uri: recording.uri,
          name: `recording.${recording.fileType}`,
          type: `audio/${recording.fileType}`
        } as any;
        formData.append('file', audioFile);
      }

      // Add parameters for multi-language support
      formData.append('model_id', 'scribe_v1');
      // Use null/undefined for auto-detection instead of 'auto'
      // formData.append('language_code', null); // Let ElevenLabs auto-detect

      // Use ElevenLabs Speech-to-Text API with retry logic
      const transcriptionResponse = await retryWithBackoff(async () => {
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          });
          
          // Parse error details for better handling
          let errorDetails = '';
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.detail?.message || errorText;
          } catch {
            errorDetails = errorText;
          }
          
          throw new Error(`ElevenLabs transcription failed: ${response.statusText} - ${errorDetails}`);
        }
        
        return response;
      }, 3, 2000); // 3 retries with 2 second base delay

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

    } catch (error: any) {
      console.error('Multi-language transcription error:', error);
      
      // Show user-friendly error message based on error type
      const isRateLimitError = error.message?.includes('system_busy') || error.message?.includes('429');
      const errorMessage = isRateLimitError 
        ? "The transcription service is currently busy. Please try again in a few moments."
        : "Failed to transcribe and translate audio. Please try again.";
      
      Alert.alert(
        "Transcription Error",
        errorMessage
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
        formData.append('file', file);
      } else {
        // For mobile platforms
        const audioFile = {
          uri: recording.uri,
          name: `recording.${recording.fileType}`,
          type: `audio/${recording.fileType}`
        } as any;
        formData.append('file', audioFile);
      }

      // Use ElevenLabs API for speaker diarization with multi-language support
      let apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      
      // Fallback: try without EXPO_PUBLIC prefix (in case of env loading issues)
      if (!apiKey) {
        apiKey = process.env.ELEVENLABS_API_KEY;
      }
      
      // Temporary hardcoded fallback for testing (remove in production)
      if (!apiKey) {
        apiKey = 'sk_577788b6902027d187ced93cc2ac667c8d379397cb139e1f';
        console.warn('Using hardcoded API key for speaker diarization - this should be fixed in production');
      }
      
      console.log('DEBUG: Speaker diarization API key check:', {
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPrefix: apiKey?.substring(0, 8) || 'none',
        envVars: Object.keys(process.env).filter(key => key.includes('ELEVEN'))
      });
      
      if (!apiKey) {
        console.error('ERROR: ElevenLabs API key not found for speaker diarization');
        console.error('Available env vars:', Object.keys(process.env));
        throw new Error('ElevenLabs API key not configured');
      }

      // Add multi-language parameters
      formData.append('model_id', 'scribe_v1');
      // Use null/undefined for auto-detection instead of 'auto'
      // formData.append('language_code', null); // Let ElevenLabs auto-detect
      formData.append('diarize', 'true');

      const diarizationResponse = await retryWithBackoff(async () => {
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs Speaker Diarization Error:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          });
          
          // Parse error details for better handling
          let errorDetails = '';
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.detail?.message || errorText;
          } catch {
            errorDetails = errorText;
          }
          
          // Check if it's a retryable error
          const isRetryable = 
            response.status === 429 || 
            errorDetails.includes('system_busy') ||
            errorDetails.includes('heavy traffic');
          
          if (!isRetryable) {
            // For non-retryable errors, fallback to regular transcription
            console.warn('Speaker diarization failed with non-retryable error, falling back to regular transcription');
            throw new Error('NON_RETRYABLE_ERROR'); // Special error to handle fallback
          }
          
          throw new Error(`Speaker diarization failed: ${response.statusText} - ${errorDetails}`);
        }
        
        return response;
      }, 3, 2000); // 3 retries with 2 second base delay

      const result = await diarizationResponse.json();
      const detectedLanguage = result.language || 'unknown';
      const isEnglish = detectedLanguage.toLowerCase().includes('en') || detectedLanguage.toLowerCase() === 'english';
      
      // Process ElevenLabs response format
      if (result.segments && Array.isArray(result.segments)) {
        // Create a proper speaker mapping to ensure different speakers get different labels
        const speakerMap = new Map<string, string>();
        let speakerCounter = 0;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // First, collect all unique speakers from the segments and sort them
        const uniqueSpeakers = new Set<string>();
        result.segments.forEach((seg: any) => {
          if (seg.speaker) {
            // Normalize speaker names to handle variations
            const normalizedSpeaker = seg.speaker.toString().trim();
            uniqueSpeakers.add(normalizedSpeaker);
          }
        });
        
        // Sort speakers to ensure consistent mapping
        const sortedSpeakers = Array.from(uniqueSpeakers).sort((a, b) => {
          // Try to extract numbers from speaker names for proper sorting
          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
          return aNum - bNum || a.localeCompare(b);
        });
        
        // Create mapping for each unique speaker
        sortedSpeakers.forEach((speaker) => {
          const speakerLabel = `Speaker ${alphabet[speakerCounter % alphabet.length]}`;
          speakerMap.set(speaker, speakerLabel);
          speakerCounter++;
        });
        
        console.log('DEBUG: Speaker mapping:', {
          uniqueSpeakers: sortedSpeakers,
          speakerMap: Object.fromEntries(speakerMap),
          totalSegments: result.segments.length,
          segmentSpeakers: result.segments.map((seg: any) => seg.speaker)
        });
        
        const speakers: string[] = Array.from(speakerMap.values());
        
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
        
        const processedSegments = translatedSegments.map((seg: any) => {
          const normalizedSpeaker = seg.speaker ? seg.speaker.toString().trim() : 'Unknown';
          const mappedSpeaker = speakerMap.get(normalizedSpeaker) || `Speaker ${normalizedSpeaker}`;
          
          return {
            speaker: mappedSpeaker,
            text: seg.text || '',
            translated_text: seg.translated_text,
            start_time: seg.start_time || 0,
            end_time: seg.end_time || 0,
            language: seg.language
          };
        });
        
        console.log('DEBUG: Processed segments:', {
          segmentCount: processedSegments.length,
          speakers: speakers,
          sampleSegments: processedSegments.slice(0, 3)
        });
        
        return {
          segments: processedSegments,
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

    } catch (error: any) {
      console.error('Speaker diarization error:', error);
      
      // Handle fallback for non-retryable errors
      if (error.message === 'NON_RETRYABLE_ERROR') {
        try {
          console.warn('Attempting fallback to regular transcription...');
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
        } catch (fallbackError) {
          console.error('Fallback transcription also failed:', fallbackError);
        }
      }
      
      // Show user-friendly error message
      const isRateLimitError = error.message?.includes('system_busy') || error.message?.includes('429');
      const errorMessage = isRateLimitError 
        ? "The transcription service is currently busy. Please try again in a few moments."
        : "Failed to transcribe with speaker separation. Please try again or use regular transcription.";
      
      Alert.alert(
        "Speaker Diarization Error",
        errorMessage
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