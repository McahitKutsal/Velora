'use client';

import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import { speak, isSpeechSupported } from '@/lib/speech';

// Metni verilen dilde (ör. 'ru-RU', 'de-DE') seslendiren küçük hoparlör butonu.
// Kart içinde tıklamaların üst öğeye yayılmaması için stopPropagation yapar.
export default function SpeakButton({ text, lang = 'ru-RU', size = 'small', sx }) {
  const [supported] = useState(() => isSpeechSupported());
  if (!supported || !text?.trim()) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    speak(text, lang);
  };

  return (
    <Tooltip title="Seslendir">
      <IconButton
        size={size}
        onClick={handleClick}
        aria-label="Seslendir"
        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' }, ...sx }}
      >
        <VolumeUpRoundedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </Tooltip>
  );
}
