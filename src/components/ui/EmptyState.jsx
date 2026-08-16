'use client';

import { Box, Card, Typography } from '@mui/material';

/** Boş liste durumu: ikon, tek cümlelik açıklama, tek eylem. */
export default function EmptyState({ icon, title, description, action, compact }) {
  return (
    <Card sx={{ borderStyle: 'dashed', bgcolor: 'transparent' }}>
      <Box sx={{ textAlign: 'center', py: compact ? 5 : 8, px: 3 }}>
        {icon && (
          <Box
            sx={{
              width: 52,
              height: 52,
              mx: 'auto',
              mb: 2,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              color: 'text.disabled',
              '& svg': { fontSize: 26 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 380, mx: 'auto', mb: action ? 3 : 0 }}>
            {description}
          </Typography>
        )}
        {action}
      </Box>
    </Card>
  );
}
