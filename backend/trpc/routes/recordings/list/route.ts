import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const listRecordingsSchema = z.object({ userId: z.string() });

export default publicProcedure
  .input(listRecordingsSchema)
  .query(async ({ input }: { input: z.infer<typeof listRecordingsSchema> }) => {
    const startTime = Date.now();
    console.log('BACKEND_LIST_RECORDINGS: Starting recordings fetch...', {
      userId: input.userId
    });

    try {
      // Validate user ID
      if (!input.userId) {
        console.error('BACKEND_LIST_RECORDINGS_ERROR: Missing userId');
        throw new Error('User ID is required');
      }

      console.log('BACKEND_LIST_RECORDINGS: Executing database query...');
      const { data, error } = await supabaseAdmin
        .from('recordings')
        .select('*')
        .eq('user_id', input.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('BACKEND_LIST_RECORDINGS_ERROR: Supabase query failed:', {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          },
          userId: input.userId,
          duration: Date.now() - startTime
        });
        throw new Error(`Failed to fetch recordings: ${error.message}`);
      }

      console.log('BACKEND_LIST_RECORDINGS: Query successful:', {
        recordCount: data?.length || 0,
        userId: input.userId,
        duration: Date.now() - startTime
      });

      const recordings = (data || []).map((record: any) => ({
        id: record.id,
        uri: record.uri,
        duration: record.duration,
        title: record.title,
        fileType: record.file_type,
        transcription: record.transcription,
        speakerSegments: record.speaker_segments ? JSON.parse(record.speaker_segments) : undefined,
        speakers: record.speakers ? JSON.parse(record.speakers) : undefined,
        createdAt: new Date(record.created_at),
      }));

      console.log('BACKEND_LIST_RECORDINGS: Process completed successfully:', {
        recordCount: recordings.length,
        totalDuration: Date.now() - startTime
      });

      return recordings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('BACKEND_LIST_RECORDINGS_ERROR: Recordings fetch failed:', {
        error: errorMessage,
        stack: errorStack,
        userId: input.userId,
        duration: Date.now() - startTime
      });
      
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  });