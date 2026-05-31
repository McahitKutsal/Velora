'use client';

import { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'background.paper',
            color: 'text.primary',
          }}
          elevation={0}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5 }}>
              <MenuIcon />
            </IconButton>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #4da8da 0%, #2e7eaa 100%)',
                mr: 1,
              }}
            >
              <ShowChartIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Velora
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
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
