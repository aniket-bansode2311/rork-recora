import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const updateNoteSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  userId: z.string(),
});

export default publicProcedure
  .input(updateNoteSchema)
  .mutation(async ({ input }: { input: z.infer<typeof updateNoteSchema> }) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) {
        updateData.title = input.title;
      }
      if (input.content !== undefined) {
        updateData.content = input.content;
      }
      if (input.summary !== undefined) {
        updateData.summary = input.summary;
      }
      if (input.keyPoints !== undefined) {
        updateData.key_points = JSON.stringify(input.keyPoints);
      }

      const { data, error } = await supabaseAdmin
        .from('notes')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', input.userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating note:', error);
        throw new Error(`Failed to update note: ${error.message}`);
      }

      return {
        success: true,
        note: {
          id: data.id,
          title: data.title,
          content: data.content,
          summary: data.summary,
          keyPoints: data.key_points ? JSON.parse(data.key_points) : undefined,
          updatedAt: new Date(data.updated_at),
        }
      };
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note in database');
    }
  });