import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

export default publicProcedure
  .input(z.object({ 
    id: z.string(),
    userId: z.string() 
  }))
  .mutation(async ({ input }) => {
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