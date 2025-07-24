// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { TRPCProvider } from '@/providers/TRPCProvider';
import { ThemeProvider } from '@/hooks/use-theme';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // User is signed in but still on auth screens, redirect to main app
      router.replace('/(tabs)' as any); // or your main app route
    } else if (!isAuthenticated && !inAuthGroup) {
      // User is not signed in but trying to access protected routes
      router.replace('/(auth)/login' as any);
    }
  }, [isAuthenticated, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Add other screens here */}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <TRPCProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}