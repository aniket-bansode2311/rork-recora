import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // In Rork environment, the API is available at the same origin
  if (typeof window !== 'undefined') {
    // Browser - use relative URL
    return '';
  }
  
  // For development fallback
  if (__DEV__) {
    return "http://localhost:8081";
  }

  // Production fallback
  return '';
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => {
        return {
          'Content-Type': 'application/json',
        };
      },
      // Add fetch options for better error handling
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }).catch((error) => {
          console.error('tRPC fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});

// Create a standalone client for use outside React components
export const standaloneClient = trpcClient;