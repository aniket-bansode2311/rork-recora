export interface SpeakerSegment {
  speaker: string;
  text: string;
  translated_text?: string;
  start_time: number;
  end_time: number;
  language?: string;
}

export interface Recording {
  id: string;
  uri: string;
  duration: number;
  title: string;
  createdAt: Date;
  fileType: string;
  transcription?: string;
  translatedTranscription?: string;
  detectedLanguage?: string;
  speakerSegments?: SpeakerSegment[];
  speakers?: string[];
}