import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const createRecordingSchema = z.object({
  id: z.string(),
  uri: z.string(),
  duration: z.number(),
  title: z.string(),
  fileType: z.string(),
  transcription: z.string().optional(),
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
  .input(createRecordingSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createRecordingSchema> }) => {
    try {
      console.log('Creating recording in database:', {
        id: input.id,
        userId: input.userId,
        title: input.title,
        duration: input.duration,
        fileType: input.fileType
      });

      // Validate required fields
      if (!input.userId) {
        throw new Error('User ID is required');
      }
      if (!input.id) {
        throw new Error('Recording ID is required');
      }
      if (!input.uri) {
        throw new Error('Recording URI is required');
      }

      const { data, error } = await supabaseAdmin
        .from('recordings')
        .insert({
          id: input.id,
          user_id: input.userId,
          uri: input.uri,
          duration: input.duration,
          title: input.title,
          file_type: input.fileType,
          transcription: input.transcription,
          speaker_segments: input.speakerSegments ? JSON.stringify(input.speakerSegments) : null,
          speakers: input.speakers ? JSON.stringify(input.speakers) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating recording:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to save recording: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      console.log('Recording created successfully:', data.id);

      return {
        success: true,
        recording: {
          id: data.id,
          uri: data.uri,
          duration: data.duration,
          title: data.title,
          fileType: data.file_type,
          transcription: data.transcription,
          speakerSegments: data.speaker_segments ? JSON.parse(data.speaker_segments) : undefined,
          speakers: data.speakers ? JSON.parse(data.speakers) : undefined,
          createdAt: new Date(data.created_at),
        }
      };
    } catch (error) {
      console.error('Error creating recording:', error);
      throw new Error(`Failed to save recording to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });