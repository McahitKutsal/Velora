'use client';

import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Avatar,
  TextField,
  MenuItem,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/components/AppSettingsContext';
import { CURRENCIES } from '@/utils/currency';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode, currency, setCurrency } = useAppSettings();

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Ayarlar
      </Typography>

      <Card sx={{ maxWidth: 600, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profil
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar src={user?.picture} alt={user?.name} sx={{ width: 56, height: 56 }} />
            <Box>
              <Typography fontWeight="bold">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={logout}>
            Çıkış Yap
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Görünüm
          </Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
            label="Karanlık Mod"
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Para Birimi
          </Typography>
          <TextField
            select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            sx={{ minWidth: 250 }}
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Uygulama Hakkında
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Velora v0.1.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yatırım ve görev takip uygulaması
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Next.js + Material UI + SQLite ile geliştirildi
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
