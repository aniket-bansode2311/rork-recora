import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  console.log('tRPC Base URL:', baseUrl); // Debug log
  
  if (baseUrl) {
    return baseUrl;
  }

  // Fallback for development
  if (__DEV__) {
    console.log('Using development fallback URL');
    return 'http://localhost:3000'; // Adjust this to match your backend
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      // Add error handling
      fetch(url, options) {
        console.log('tRPC request to:', url); // Debug log
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          },
        }).then(async (response) => {
          console.log('tRPC response status:', response.status); // Debug log
          
          if (!response.ok) {
            const text = await response.text();
            console.log('tRPC error response:', text); // Debug log
            throw new Error(`HTTP ${response.status}: ${text}`);
          }
          
          return response;
        });
      },
    }),
  ],
});

// Create a standalone client for use outside React components
export const standaloneClient = trpcClient;