import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const deleteRecordingSchema = z.object({ 
  id: z.string(),
  userId: z.string() 
});

export default publicProcedure
  .input(deleteRecordingSchema)
  .mutation(async ({ input }: { input: z.infer<typeof deleteRecordingSchema> }) => {
    try {
      const { error } = await supabaseAdmin
        .from('recordings')
        .delete()
        .eq('id', input.id)
        .eq('user_id', input.userId);

      if (error) {
        console.error('Supabase error deleting recording:', error);
        throw new Error(`Failed to delete recording: ${error.message}`);
      }

      return {
        success: true,
        deletedId: input.id
      };
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw new Error('Failed to delete recording from database');
    }
  });