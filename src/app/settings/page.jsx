'use client';

import {
  Box,
  Typography,
  Switch,
  Button,
  Avatar,
  TextField,
  MenuItem,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/components/AppSettingsContext';
import { CURRENCIES } from '@/utils/currency';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';

/** Ayar satırı: solda etiket + açıklama, sağda kontrol. */
function SettingRow({ label, description, control, divider }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        py: 1.75,
        borderTop: divider ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">{label}</Typography>
        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{control}</Box>
    </Box>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode, currency, setCurrency } = useAppSettings();

  return (
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader title="Ayarlar" />

      <SectionCard title="Profil" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.picture} alt={user?.name} sx={{ width: 48, height: 48 }} />
          <Box sx={{ minWidth: 0, mr: 'auto' }}>
            <Typography sx={{ fontWeight: 650 }} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
          <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Çıkış
          </Button>
        </Box>
      </SectionCard>

      <SectionCard title="Tercihler" sx={{ mb: 2 }}>
        <SettingRow
          label="Karanlık mod"
          description="Arayüzü koyu temaya geçirir"
          control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
        />
        <SettingRow
          divider
          label="Para birimi"
          description="Tutarların gösterileceği birim"
          control={
            <TextField select value={currency} onChange={(e) => setCurrency(e.target.value)} size="small" sx={{ minWidth: 180 }}>
              {CURRENCIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          }
        />
      </SectionCard>

      <SectionCard title="Uygulama">
        <Typography variant="body2" color="text.secondary">
          Velora v0.1.0 — kelime kartları, yatırım ve görev takibi.
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          Next.js · Material UI · libSQL
        </Typography>
      </SectionCard>
    </Box>
  );
}
