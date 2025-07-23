import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

const createRecordingSchema = z.object({
  id: z.string(),
  uri: z.string(),
  duration: z.number(),
  title: z.string(),
  fileType: z.string(),
  transcription: z.string().optional(),
});

export default protectedProcedure
  .input(createRecordingSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('recordings')
        .insert({
          id: input.id,
          user_id: ctx.userId,
          uri: input.uri,
          duration: input.duration,
          title: input.title,
          file_type: input.fileType,
          transcription: input.transcription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating recording:', error);
        throw new Error(`Failed to save recording: ${error.message}`);
      }

      return {
        success: true,
        recording: {
          id: data.id,
          uri: data.uri,
          duration: data.duration,
          title: data.title,
          fileType: data.file_type,
          transcription: data.transcription,
          createdAt: new Date(data.created_at),
        }
      };
    } catch (error) {
      console.error('Error creating recording:', error);
      throw new Error('Failed to save recording to database');
    }
  });