import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#4da8da' },
      secondary: { main: '#9c27b0' },
      ...(mode === 'dark' && {
        background: {
          default: '#0a1929',
          paper: '#0f2744',
        },
        text: {
          primary: '#e3f2fd',
          secondary: '#90caf9',
        },
      }),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
  });
