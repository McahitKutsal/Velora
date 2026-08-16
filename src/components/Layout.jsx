'use client';

import { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/MenuRounded';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import Brand from './Brand';

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar position="fixed" sx={{ color: 'text.primary' }} elevation={0}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5 }} aria-label="Menüyü aç">
              <MenuIcon />
            </IconButton>
            <Brand size={26} />
          </Toolbar>
        </AppBar>
      )}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          backgroundColor: 'background.default',
          ...(isMobile && { mt: '64px' }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
