import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        light: '#7cc3e6',
        main: '#4da8da',
        dark: '#2e7eaa',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#ba68c8',
        main: '#9c27b0',
        dark: '#7b1fa2',
      },
      success: {
        main: isDark ? '#4ade80' : '#16a34a',
        light: isDark ? '#86efac' : '#22c55e',
        dark: isDark ? '#22c55e' : '#15803d',
      },
      error: {
        main: isDark ? '#f87171' : '#dc2626',
        light: isDark ? '#fca5a5' : '#ef4444',
        dark: isDark ? '#ef4444' : '#b91c1c',
      },
      warning: {
        main: isDark ? '#fbbf24' : '#d97706',
        light: isDark ? '#fcd34d' : '#f59e0b',
        dark: isDark ? '#f59e0b' : '#b45309',
      },
      info: {
        main: isDark ? '#60a5fa' : '#2563eb',
      },
      ...(isDark
        ? {
            background: {
              default: '#0a1626',
              paper: '#11263f',
            },
            text: {
              primary: '#e6edf5',
              secondary: '#9bb3cf',
            },
            divider: 'rgba(255, 255, 255, 0.08)',
            action: {
              hover: 'rgba(255, 255, 255, 0.04)',
              selected: 'rgba(77, 168, 218, 0.16)',
            },
          }
        : {
            background: {
              default: '#f5f7fb',
              paper: '#ffffff',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
            divider: 'rgba(15, 23, 42, 0.08)',
            action: {
              hover: 'rgba(15, 23, 42, 0.03)',
              selected: 'rgba(77, 168, 218, 0.10)',
            },
          }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      caption: { letterSpacing: 0 },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFeatureSettings: '"cv11", "ss01"',
          },
          'table, .MuiTableCell-root, .num': {
            fontVariantNumeric: 'tabular-nums',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRight: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.3)'
              : '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 600,
            paddingTop: 6,
            paddingBottom: 6,
          },
          containedPrimary: {
            boxShadow: '0 1px 2px rgba(77, 168, 218, 0.3)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.Mui-selected': {
              backgroundColor: isDark
                ? 'rgba(77, 168, 218, 0.16)'
                : 'rgba(77, 168, 218, 0.10)',
              color: isDark ? '#7cc3e6' : '#2e7eaa',
              '& .MuiListItemIcon-root': {
                color: isDark ? '#7cc3e6' : '#2e7eaa',
              },
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(77, 168, 218, 0.22)'
                  : 'rgba(77, 168, 218, 0.14)',
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 40,
            color: isDark ? '#9bb3cf' : '#64748b',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
          },
          head: {
            fontWeight: 600,
            color: isDark ? '#9bb3cf' : '#64748b',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 8,
          },
          sizeSmall: {
            height: 22,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            '&.Mui-selected': {
              backgroundColor: isDark
                ? 'rgba(77, 168, 218, 0.16)'
                : 'rgba(77, 168, 218, 0.10)',
              color: isDark ? '#7cc3e6' : '#2e7eaa',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(77, 168, 218, 0.22)'
                  : 'rgba(77, 168, 218, 0.14)',
              },
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
            padding: 4,
            borderRadius: 12,
            gap: 4,
          },
          grouped: {
            border: 'none !important',
            borderRadius: '8px !important',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
            padding: '6px 10px',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
    },
  });
};
