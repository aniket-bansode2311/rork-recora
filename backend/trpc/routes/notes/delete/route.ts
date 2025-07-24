import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const deleteNoteSchema = z.object({ 
  id: z.string(),
  userId: z.string() 
});

export default publicProcedure
  .input(deleteNoteSchema)
  .mutation(async ({ input }: { input: z.infer<typeof deleteNoteSchema> }) => {
    try {
      const { error } = await supabaseAdmin
        .from('notes')
        .delete()
        .eq('id', input.id)
        .eq('user_id', input.userId);

      if (error) {
        console.error('Supabase error deleting note:', error);
        throw new Error(`Failed to delete note: ${error.message}`);
      }

      return {
        success: true,
        deletedId: input.id
      };
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note from database');
    }
  });