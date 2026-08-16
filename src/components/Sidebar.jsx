'use client';

import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/GridViewRounded';
import ShowChartIcon from '@mui/icons-material/ShowChartRounded';
import ChecklistIcon from '@mui/icons-material/ChecklistRounded';
import StyleIcon from '@mui/icons-material/StyleRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Brand from './Brand';

export const DRAWER_WIDTH = 248;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Yatırımlar', icon: <ShowChartIcon />, path: '/investments' },
  { text: 'Yapılacaklar', icon: <ChecklistIcon />, path: '/todos' },
  { text: 'Kartlar', icon: <StyleIcon />, path: '/flashcards' },
  { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const handleNavigate = (path) => {
    router.push(path);
    if (isMobile) onClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Brand />
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1.25, py: 0.5 }}>
        {menuItems.map((item) => {
          const selected =
            pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(`${item.path}/`));
          return (
            <ListItemButton
              key={item.text}
              selected={selected}
              onClick={() => handleNavigate(item.path)}
              sx={{ my: 0.25, py: 0.9, px: 1.5 }}
            >
              <ListItemIcon sx={{ '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: selected ? 650 : 500,
                  fontSize: '0.9rem',
                  letterSpacing: '-0.01em',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      {user && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mx: 0.5 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src={user.picture} alt={user.name} sx={{ width: 34, height: 34 }} />
              <Box
                sx={{
                  position: 'absolute',
                  right: -1,
                  bottom: -1,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  border: '2px solid',
                  borderColor: 'background.paper',
                }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
