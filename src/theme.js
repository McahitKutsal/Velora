import { createTheme } from '@mui/material/styles';
import { tokens, RADIUS } from '@/lib/designTokens';

// Yüzeyler kenarlık VEYA gölge ile ayrılır, ikisi birden değil. Işık modunda
// saç teli kenarlık; yükseltilmiş katmanlarda (menü, diyalog) yumuşak gölge.
const SHADOW_LIGHT = '0 4px 16px rgba(26, 25, 23, 0.08), 0 1px 3px rgba(26, 25, 23, 0.05)';
const SHADOW_DARK = '0 4px 20px rgba(0, 0, 0, 0.45)';

export const getTheme = (mode) => {
  const t = tokens(mode);
  const { isDark, neutral, brand, chart } = t;
  const shadow = isDark ? SHADOW_DARK : SHADOW_LIGHT;

  return createTheme({
    palette: {
      mode,
      primary: brand,
      secondary: {
        main: t.categorical[1],
        contrastText: '#ffffff',
      },
      success: { main: t.status.good, contrastText: '#ffffff' },
      warning: { main: t.status.warning, contrastText: '#1a1917' },
      error: { main: t.status.critical, contrastText: '#ffffff' },
      info: { main: t.categorical[0], contrastText: '#ffffff' },
      background: { default: neutral.plane, paper: neutral.surface },
      text: {
        primary: neutral.ink,
        secondary: neutral.inkMuted,
        disabled: neutral.inkFaint,
      },
      divider: neutral.border,
      action: {
        hover: neutral.hover,
        selected: isDark ? 'rgba(144, 133, 233, 0.16)' : 'rgba(74, 58, 167, 0.08)',
      },

      // --- Uygulamaya özel roller (bileşenler buradan okur) ---
      surface: {
        sunken: neutral.sunken,
        border: neutral.border,
        borderStrong: neutral.borderStrong,
      },
      data: {
        categorical: t.categorical,
        stage: t.stage,
        status: t.status,
        rating: t.rating,
        delta: t.delta,
        chart,
      },
    },

    typography: {
      fontFamily: 'var(--font-sans), "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
      // Sayfa başlığı: küçük ekranda 24px, geniş ekranda 30px'e kadar akar.
      h4: { fontSize: 'clamp(1.5rem, 1.15rem + 1.4vw, 1.875rem)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 },
      h5: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 },
      h6: { fontSize: '1.0625rem', fontWeight: 650, letterSpacing: '-0.015em', lineHeight: 1.35 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 650, letterSpacing: '-0.01em' },
      subtitle2: { fontSize: '0.875rem', fontWeight: 650, letterSpacing: '-0.01em' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.78rem', letterSpacing: 0, lineHeight: 1.45 },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1.6,
        color: neutral.inkFaint,
      },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    },

    shape: { borderRadius: RADIUS.md },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFeatureSettings: '"cv11", "ss01"',
            backgroundColor: neutral.plane,
          },
          // Sayılar sütun hâlinde hizalansın; serbest metinde orantılı kalsın.
          'table, .MuiTableCell-root, .num': { fontVariantNumeric: 'tabular-nums' },
          '::selection': {
            backgroundColor: isDark ? 'rgba(144,133,233,0.32)' : 'rgba(74,58,167,0.16)',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          elevation1: { boxShadow: shadow },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(19,18,17,0.82)' : 'rgba(247,246,243,0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${neutral.border}`,
            boxShadow: 'none',
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: neutral.plane,
            borderRight: `1px solid ${neutral.border}`,
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.lg,
            border: `1px solid ${neutral.border}`,
            boxShadow: 'none',
            transition: 'border-color 0.18s ease, background-color 0.18s ease',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.md,
            paddingInline: 16,
            paddingBlock: 8,
            minHeight: 40,
          },
          sizeSmall: { paddingInline: 12, paddingBlock: 5, minHeight: 34, fontSize: '0.84rem' },
          sizeLarge: { paddingInline: 22, paddingBlock: 11, minHeight: 48, fontSize: '0.98rem' },
          outlined: { borderColor: neutral.borderStrong },
          text: { paddingInline: 10 },
        },
      },

      MuiIconButton: {
        styleOverrides: { root: { borderRadius: RADIUS.sm } },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.md,
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(144,133,233,0.16)' : 'rgba(74,58,167,0.08)',
              color: brand.main,
              '& .MuiListItemIcon-root': { color: brand.main },
              '&:hover': {
                backgroundColor: isDark ? 'rgba(144,133,233,0.22)' : 'rgba(74,58,167,0.12)',
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 38, color: neutral.inkMuted } },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: neutral.border },
          head: {
            fontWeight: 650,
            color: neutral.inkFaint,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            backgroundColor: 'transparent',
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 550, borderRadius: RADIUS.sm },
          sizeSmall: { height: 24 },
          outlined: { borderColor: neutral.border },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: `${RADIUS.sm}px !important`,
            border: 'none',
            color: neutral.inkMuted,
            paddingInline: 12,
            '&:hover': { backgroundColor: neutral.hover },
            '&.Mui-selected': {
              backgroundColor: neutral.surface,
              color: neutral.ink,
              boxShadow: isDark ? 'none' : '0 1px 2px rgba(26,25,23,0.10)',
              border: `1px solid ${neutral.border}`,
              '&:hover': { backgroundColor: neutral.surface },
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: neutral.sunken,
            padding: 3,
            borderRadius: RADIUS.md,
            gap: 2,
          },
          grouped: { border: 'none' },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.xl,
            border: `1px solid ${neutral.border}`,
            backgroundImage: 'none',
            boxShadow: shadow,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: 20, paddingTop: 8 } },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.md,
            border: `1px solid ${neutral.border}`,
            boxShadow: shadow,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: { root: { borderRadius: RADIUS.sm, marginInline: 6, fontSize: '0.9rem' } },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.md,
            border: `1px solid ${neutral.border}`,
            boxShadow: shadow,
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: RADIUS.sm,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            backgroundColor: isDark ? '#3a3733' : '#2b2926',
          },
          arrow: { color: isDark ? '#3a3733' : '#2b2926' },
        },
      },

      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.md,
            backgroundColor: neutral.sunken,
            '& fieldset': { borderColor: neutral.border },
            '&:hover fieldset': { borderColor: neutral.borderStrong },
          },
          input: { '&::placeholder': { color: neutral.inkFaint, opacity: 1 } },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, backgroundColor: neutral.sunken },
          bar: { borderRadius: 999 },
        },
      },

      MuiDivider: { styleOverrides: { root: { borderColor: neutral.border } } },

      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', minHeight: 44 },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { borderRadius: 999, backgroundColor: neutral.inkFaint, opacity: 0.4 },
        },
      },
    },
  });
};
