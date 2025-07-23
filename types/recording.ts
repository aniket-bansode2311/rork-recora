export interface Recording {
  id: string;
  uri: string;
  duration: number;
  title: string;
  createdAt: Date;
  fileType: string;
  transcription?: string;
  isSynced?: boolean; // Track sync status for offline support
}