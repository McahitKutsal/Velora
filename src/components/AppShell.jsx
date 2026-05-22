'use client';

import { useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { getTheme } from '@/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppSettingsProvider, useAppSettings } from './AppSettingsContext';
import Layout from './Layout';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!user) {
    return <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>{children}</Box>;
  }

  return <Layout>{children}</Layout>;
}

function ThemedShell({ children }) {
  const { darkMode } = useAppSettings();
  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProtectedLayout>{children}</ProtectedLayout>
    </ThemeProvider>
  );
}

export default function AppShell({ children }) {
  return (
    <AppRouterCacheProvider>
      <AppSettingsProvider>
        <AuthProvider>
          <ThemedShell>{children}</ThemedShell>
        </AuthProvider>
      </AppSettingsProvider>
    </AppRouterCacheProvider>
  );
}
