'use client';

import { Box, Typography, useTheme } from '@mui/material';

/**
 * Recharts için ortak krom. Izgara ve eksenler geri planda kalır (saç teli,
 * dikey ızgara yok, eksen çizgisi yok); dikkat veriye kalsın.
 */
export function useChartTokens() {
  const theme = useTheme();
  const c = theme.palette.data.chart;

  return {
    colors: theme.palette.data.categorical,
    surface: theme.palette.background.paper,
    axis: {
      tick: { fontSize: 11, fill: c.label },
      axisLine: false,
      tickLine: false,
      stroke: c.axis,
    },
    grid: {
      stroke: c.grid,
      strokeDasharray: '0',
      vertical: false,
    },
    cursor: { fill: theme.palette.action.hover },
    // Yığılmış/komşu dolgular arasında 2px yüzey boşluğu bırakır.
    gap: theme.palette.background.paper,
  };
}

/** Grafik ipucu kutusu — değerler metin tokenlarını giyer, seri rengini değil. */
export function ChartTooltip({ title, rows = [] }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
        boxShadow: 3,
        minWidth: 140,
      }}
    >
      {title && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: i ? 0.5 : 0 }}>
          {r.color && (
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: r.color, flexShrink: 0 }} />
          )}
          {r.label && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
              {r.label}
            </Typography>
          )}
          <Typography variant="caption" sx={{ fontWeight: 700 }} className="num">
            {r.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Seri kimliğini renkle birlikte yazıyla da taşıyan lejant. */
export function ChartLegend({ items }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
      {items.map((it) => (
        <Box key={it.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: it.color, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            {it.label}
            {it.value != null && (
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', ml: 0.5 }} className="num">
                {it.value}
              </Box>
            )}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
