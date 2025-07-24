import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const createNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  originalTranscription: z.string().optional(),
  recordingId: z.string().optional(),
  recordingTitle: z.string().optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  userId: z.string(),
});

const createNoteProcedure = publicProcedure
  .input(createNoteSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createNoteSchema> }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('notes')
        .insert({
          id: input.id,
          user_id: input.userId,
          title: input.title,
          content: input.content,
          original_transcription: input.originalTranscription,
          recording_id: input.recordingId,
          recording_title: input.recordingTitle,
          summary: input.summary,
          key_points: input.keyPoints ? JSON.stringify(input.keyPoints) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating note:', error);
        throw new Error(`Failed to save note: ${error.message}`);
      }

      return {
        success: true,
        note: {
          id: data.id,
          title: data.title,
          content: data.content,
          originalTranscription: data.original_transcription,
          recordingId: data.recording_id,
          recordingTitle: data.recording_title,
          summary: data.summary,
          keyPoints: data.key_points ? JSON.parse(data.key_points) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        }
      };
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to save note to database');
    }
  });

export default createNoteProcedure;