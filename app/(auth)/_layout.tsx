import { TRPCProvider } from '@/providers/TRPCProvider';

export default function RootLayout() {
  return (
    <TRPCProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </TRPCProvider>
  );
}