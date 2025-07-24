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
    const startTime = Date.now();
    console.log('BACKEND_CREATE_RECORDING: Starting recording creation process...', {
      recordingId: input.id,
      userId: input.userId,
      title: input.title,
      duration: input.duration,
      fileType: input.fileType,
      uriLength: input.uri?.length || 0,
      hasTranscription: !!input.transcription,
      hasSpeakerSegments: !!input.speakerSegments,
      hasSpeakers: !!input.speakers
    });

    try {
      // Step 1: Validate required fields
      console.log('BACKEND_CREATE_RECORDING: Validating required fields...');
      if (!input.userId) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: Missing userId');
        throw new Error('User ID is required');
      }
      if (!input.id) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: Missing recording id');
        throw new Error('Recording ID is required');
      }
      if (!input.uri) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: Missing recording URI');
        throw new Error('Recording URI is required');
      }
      if (typeof input.duration !== 'number' || input.duration < 0) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: Invalid duration:', input.duration);
        throw new Error('Valid duration is required');
      }
      console.log('BACKEND_CREATE_RECORDING: Field validation passed');

      // Step 2: Prepare database insert data
      console.log('BACKEND_CREATE_RECORDING: Preparing database insert...');
      const insertData = {
        id: input.id,
        user_id: input.userId,
        uri: input.uri,
        duration: input.duration,
        title: input.title,
        file_type: input.fileType,
        transcription: input.transcription || null,
        speaker_segments: input.speakerSegments ? JSON.stringify(input.speakerSegments) : null,
        speakers: input.speakers ? JSON.stringify(input.speakers) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('BACKEND_CREATE_RECORDING: Insert data prepared:', {
        id: insertData.id,
        user_id: insertData.user_id,
        title: insertData.title,
        duration: insertData.duration,
        file_type: insertData.file_type,
        hasTranscription: !!insertData.transcription,
        hasSpeakerSegments: !!insertData.speaker_segments,
        hasSpeakers: !!insertData.speakers
      });

      // Step 3: Insert into database
      console.log('BACKEND_CREATE_RECORDING: Executing database insert...');
      const { data, error } = await supabaseAdmin
        .from('recordings')
        .insert(insertData)
        .select()
        .single();

      // Step 4: Handle database response
      if (error) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: Supabase insert failed:', {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          },
          recordingId: input.id,
          userId: input.userId,
          duration: Date.now() - startTime
        });
        throw new Error(`Database insert failed: ${error.message} (Code: ${error.code})`);
      }

      if (!data) {
        console.error('BACKEND_CREATE_RECORDING_ERROR: No data returned from database insert');
        throw new Error('Database insert succeeded but returned no data');
      }

      console.log('BACKEND_CREATE_RECORDING: Database insert successful:', {
        recordingId: data.id,
        userId: data.user_id,
        title: data.title,
        duration: Date.now() - startTime
      });

      // Step 5: Prepare response
      const response = {
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

      console.log('BACKEND_CREATE_RECORDING: Process completed successfully:', {
        recordingId: response.recording.id,
        totalDuration: Date.now() - startTime
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('BACKEND_CREATE_RECORDING_ERROR: Recording creation failed:', {
        error: errorMessage,
        stack: errorStack,
        recordingId: input.id,
        userId: input.userId,
        duration: Date.now() - startTime,
        inputData: {
          id: input.id,
          userId: input.userId,
          title: input.title,
          duration: input.duration,
          fileType: input.fileType,
          uriLength: input.uri?.length || 0
        }
      });
      
      throw new Error(`Failed to save recording to database: ${errorMessage}`);
    }
  });