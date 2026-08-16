'use client';

import { Box, Card, Typography } from '@mui/material';

/**
 * Başlıklı içerik kartı. Başlık satırı her yerde aynı ritimde olsun diye
 * sayfalar bunu elle kurmaz.
 */
export default function SectionCard({ title, action, children, dense, sx }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            px: dense ? 2 : 2.5,
            pt: dense ? 1.75 : 2.25,
            pb: 0.5,
          }}
        >
          {title && (
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
          )}
          {action}
        </Box>
      )}
      <Box sx={{ px: dense ? 2 : 2.5, pt: title ? 1 : dense ? 1.75 : 2.25, pb: dense ? 2 : 2.5, flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Card>
  );
}
