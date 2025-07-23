export interface Note {
  id: string;
  title: string;
  content: string;
  originalTranscription?: string;
  recordingId?: string;
  recordingTitle?: string;
  summary?: string;
  keyPoints?: string[];
  createdAt: Date;
  updatedAt: Date;
}