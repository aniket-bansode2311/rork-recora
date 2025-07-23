import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const listRecordingsSchema = z.object({ userId: z.string() });

export default publicProcedure
  .input(listRecordingsSchema)
  .query(async ({ input }: { input: z.infer<typeof listRecordingsSchema> }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('recordings')
        .select('*')
        .eq('user_id', input.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching recordings:', error);
        throw new Error(`Failed to fetch recordings: ${error.message}`);
      }

      return data.map((record: any) => ({
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
    } catch (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }
  });