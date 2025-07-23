import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../lib/supabase";

export default publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
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
        createdAt: new Date(record.created_at),
      }));
    } catch (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }
  });