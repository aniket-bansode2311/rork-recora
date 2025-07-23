import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

export default protectedProcedure
  .input(z.object({ 
    id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    try {
      const { error } = await supabaseAdmin
        .from('recordings')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.userId);

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