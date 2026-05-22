'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useAuth } from '@/contexts/AuthContext';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { login } = useAuth();
  const buttonRef = useRef(null);
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'signin_with',
        shape: 'rectangular',
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    setLoggingIn(true);
    setError(null);
    try {
      await login(response.credential);
    } catch {
      setError('Giriş başarısız. Lütfen tekrar deneyin.');
      setLoggingIn(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            py: 5,
            px: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShowChartIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h4" fontWeight="bold">
              Velora
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" textAlign="center">
            Yatırım ve görev takip uygulamasına hoş geldiniz
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {loggingIn ? <CircularProgress /> : <Box ref={buttonRef} />}
        </CardContent>
      </Card>
    </Box>
  );
}
