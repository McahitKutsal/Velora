'use client';

import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import KeyboardCapslockIcon from '@mui/icons-material/KeyboardCapslock';

// Standard Russian ЙЦУКЕН layout.
const ROWS = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', 'ё'],
];

function Key({ children, onTap, disabled, flex, active, wide }) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      // Keep the text field focused: prevent the key from stealing focus.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap}
      sx={{
        flex: flex || (wide ? '1 1 auto' : '1 1 0'),
        minWidth: { xs: 26, sm: 34 },
        height: { xs: 40, sm: 44 },
        px: wide ? 1.5 : 0.5,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        borderRadius: 1.5,
        bgcolor: active ? 'primary.main' : 'background.paper',
        color: active ? 'primary.contrastText' : 'text.primary',
        fontSize: { xs: '0.95rem', sm: '1.05rem' },
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.06s ease, background-color 0.12s ease',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
        '&:hover': disabled ? {} : { bgcolor: active ? 'primary.dark' : 'action.hover' },
        '&:active': disabled ? {} : { transform: 'translateY(1px)' },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * On-screen Russian (Cyrillic) keyboard. Purely a text-entry aid: every tap
 * calls back into the parent, which owns the input value.
 */
export default function CyrillicKeyboard({ onChar, onBackspace, onEnter, disabled }) {
  const [shift, setShift] = useState(false);

  const tapLetter = (ch) => {
    onChar(shift ? ch.toLocaleUpperCase('ru-RU') : ch);
    if (shift) setShift(false); // single-shot shift, like a soft keyboard
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        p: { xs: 0.75, sm: 1 },
        borderRadius: 2,
        bgcolor: 'action.hover',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          РУ · Rusça klavye
        </Typography>
      </Box>

      {ROWS.map((row, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {i === 2 && (
            <Key onTap={() => setShift((s) => !s)} disabled={disabled} active={shift} wide>
              <KeyboardCapslockIcon fontSize="small" />
            </Key>
          )}
          {row.map((ch) => (
            <Key key={ch} onTap={() => tapLetter(ch)} disabled={disabled}>
              {shift ? ch.toLocaleUpperCase('ru-RU') : ch}
            </Key>
          ))}
          {i === 2 && (
            <Key onTap={onBackspace} disabled={disabled} wide>
              <BackspaceOutlinedIcon fontSize="small" />
            </Key>
          )}
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Key onTap={() => onChar(' ')} disabled={disabled} flex="4 1 auto">
          <Typography variant="caption" color="text.secondary">boşluk</Typography>
        </Key>
        {onEnter && (
          <Key onTap={onEnter} disabled={disabled} wide>
            <KeyboardReturnIcon fontSize="small" />
          </Key>
        )}
      </Box>
    </Box>
  );
}
