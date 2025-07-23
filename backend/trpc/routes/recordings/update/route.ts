import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

const updateRecordingSchema = z.object({
  id: z.string(),
  transcription: z.string().optional(),
  title: z.string().optional(),
  userId: z.string(),
});

export default publicProcedure
  .input(updateRecordingSchema)
  .mutation(async ({ input }) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.transcription !== undefined) {
        updateData.transcription = input.transcription;
      }
      if (input.title !== undefined) {
        updateData.title = input.title;
      }

      const { data, error } = await supabaseAdmin
        .from('recordings')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', input.userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating recording:', error);
        throw new Error(`Failed to update recording: ${error.message}`);
      }

      return {
        success: true,
        recording: {
          id: data.id,
          transcription: data.transcription,
          title: data.title,
          userId: data.user_id,
        }
      };
    } catch (error) {
      console.error('Error updating recording:', error);
      throw new Error('Failed to update recording in database');
    }
  });