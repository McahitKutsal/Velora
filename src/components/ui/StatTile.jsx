'use client';

import { Box, Card, CardActionArea, Typography, LinearProgress } from '@mui/material';

/**
 * Tek bir sayının öne çıktığı kutu. Sayı kahramandır: etiket üstte küçük ve
 * sessiz, değer altta büyük. İkon kimlik taşır, dikkat çalmaz — bu yüzden
 * küçük ve nötr, renk yalnızca `tone` verilirse devreye girer.
 */
export default function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
  progress,
  onClick,
  href,
}) {
  const body = (
    <Box sx={{ p: 2.25, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon && (
          <Box
            sx={{
              display: 'flex',
              color: tone || 'text.disabled',
              '& svg': { fontSize: 17 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ fontWeight: 600, letterSpacing: '0.01em' }}
        >
          {label}
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto' }}>
        <Typography
          variant="h5"
          component="p"
          sx={{ fontSize: '1.6rem', lineHeight: 1.05, color: tone || 'text.primary' }}
        >
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.5 }}>
            {hint}
          </Typography>
        )}
        {progress != null && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress))}
            sx={{
              mt: 1.25,
              height: 4,
              '& .MuiLinearProgress-bar': { backgroundColor: tone || 'primary.main' },
            }}
          />
        )}
      </Box>
    </Box>
  );

  return (
    <Card sx={{ height: '100%', '&:hover': onClick || href ? { borderColor: 'primary.main' } : {} }}>
      {onClick || href ? (
        <CardActionArea onClick={onClick} href={href} sx={{ height: '100%' }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
