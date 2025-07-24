import { createTRPCRouter } from "./create-context";
import hiProcedure from "./routes/example/hi/route";
import createNoteProcedure from "./routes/notes/create/route";
import deleteNoteProcedure from "./routes/notes/delete/route";
import listNotesProcedure from "./routes/notes/list/route";
import updateNoteProcedure from "./routes/notes/update/route";
import createRecordingProcedure from "./routes/recordings/create/route";
import deleteRecordingProcedure from "./routes/recordings/delete/route";
import listRecordingsProcedure from "./routes/recordings/list/route";
import updateRecordingProcedure from "./routes/recordings/update/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
  }),
  notes: createTRPCRouter({
    create: createNoteProcedure,
    delete: deleteNoteProcedure,
    list: listNotesProcedure,
    update: updateNoteProcedure,
  }),
  recordings: createTRPCRouter({
    create: createRecordingProcedure,
    delete: deleteRecordingProcedure,
    list: listRecordingsProcedure,
    update: updateRecordingProcedure,
  }),
});

export type AppRouter = typeof appRouter;