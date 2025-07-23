import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createRecordingRoute from "./routes/recordings/create/route";
import listRecordingsRoute from "./routes/recordings/list/route";
import updateRecordingRoute from "./routes/recordings/update/route";
import deleteRecordingRoute from "./routes/recordings/delete/route";
import createNoteRoute from "./routes/notes/create/route";
import listNotesRoute from "./routes/notes/list/route";
import updateNoteRoute from "./routes/notes/update/route";
import deleteNoteRoute from "./routes/notes/delete/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  recordings: createTRPCRouter({
    create: createRecordingRoute,
    list: listRecordingsRoute,
    update: updateRecordingRoute,
    delete: deleteRecordingRoute,
  }),
  notes: createTRPCRouter({
    create: createNoteRoute,
    list: listNotesRoute,
    update: updateNoteRoute,
    delete: deleteNoteRoute,
  }),
});

export type AppRouter = typeof appRouter;