import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes with more permissive settings
app.use("*", cors({
  origin: "*", // Allow all origins for now
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Add error handling middleware
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("API Error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`tRPC Error on ${path}:`, error);
    },
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

// Health check for database connection
app.get("/health", async (c) => {
  try {
    // Test database connection
    const { supabaseAdmin } = await import("./lib/supabase");
    const { data, error } = await supabaseAdmin
      .from('recordings')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('relation "recordings" does not exist')) {
      throw error;
    }
    
    return c.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json({ 
      status: "unhealthy", 
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default app;