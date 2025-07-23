import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

const updateRecordingSchema = z.object({
  id: z.string(),
  transcription: z.string().optional(),
  title: z.string().optional(),
  speakerSegments: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    start_time: z.number(),
    end_time: z.number(),
  })).optional(),
  speakers: z.array(z.string()).optional(),
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
      if (input.speakerSegments !== undefined) {
        updateData.speaker_segments = JSON.stringify(input.speakerSegments);
      }
      if (input.speakers !== undefined) {
        updateData.speakers = JSON.stringify(input.speakers);
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
          speakerSegments: data.speaker_segments ? JSON.parse(data.speaker_segments) : undefined,
          speakers: data.speakers ? JSON.parse(data.speakers) : undefined,
          userId: data.user_id,
        }
      };
    } catch (error) {
      console.error('Error updating recording:', error);
      throw new Error('Failed to update recording in database');
    }
  });