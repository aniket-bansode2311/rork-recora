export interface SpeakerSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface Recording {
  id: string;
  uri: string;
  duration: number;
  title: string;
  createdAt: Date;
  fileType: string;
  transcription?: string;
  speakerSegments?: SpeakerSegment[];
  speakers?: string[];
}