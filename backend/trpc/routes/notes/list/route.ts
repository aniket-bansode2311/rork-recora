import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const listNotesSchema = z.object({ userId: z.string() });

export default publicProcedure
  .input(listNotesSchema)
  .query(async ({ input }: { input: z.infer<typeof listNotesSchema> }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', input.userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching notes:', error);
        throw new Error(`Failed to fetch notes: ${error.message}`);
      }

      return data.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        originalTranscription: note.original_transcription,
        recordingId: note.recording_id,
        recordingTitle: note.recording_title,
        summary: note.summary,
        keyPoints: note.key_points ? JSON.parse(note.key_points) : undefined,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  });