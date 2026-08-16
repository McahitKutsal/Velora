'use client';

import { Box, Typography } from '@mui/material';

/**
 * Her sayfanın başlığı. Başlık boyutu/ağırlığı temadan gelir — sayfalar artık
 * kendi fontSize override'ını taşımaz.
 */
export default function PageHeader({ title, subtitle, actions, sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        mb: 3,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</Box>
      )}
    </Box>
  );
}
