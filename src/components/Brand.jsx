'use client';

import { Box, Typography } from '@mui/material';

/**
 * Uygulama markası: monogram + kelime işareti.
 * Eski borsa ikonu yerine nötr bir monogram — uygulama artık yalnız yatırım
 * değil, kart çalışması ve görevleri de kapsıyor.
 */
export default function Brand({ size = 30 }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 800,
          fontSize: size * 0.52,
          letterSpacing: '-0.04em',
          flexShrink: 0,
        }}
      >
        V
      </Box>
      <Typography
        variant="h6"
        noWrap
        sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: '1.0625rem' }}
      >
        Velora
      </Typography>
    </Box>
  );
}
