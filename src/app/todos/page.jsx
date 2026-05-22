'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import useTodoStore from '@/stores/todoStore';

const PRIORITIES = [
  { value: 'low', label: 'Düşük', color: 'default' },
  { value: 'medium', label: 'Orta', color: 'warning' },
  { value: 'high', label: 'Yüksek', color: 'error' },
];

const CATEGORIES = ['Genel', 'Yatırım', 'İş', 'Kişisel', 'Alışveriş'];

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'Genel',
  due_date: '',
};

export default function TodosPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { todos, loading, saving, busyIds, fetchTodos, addTodo, updateTodo, deleteTodo, toggleTodo } =
    useTodoStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleOpen = (todo = null) => {
    if (todo) {
      setEditId(todo.id);
      setForm({
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority || 'medium',
        category: todo.category || 'Genel',
        due_date: todo.due_date || '',
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (editId) {
      await updateTodo(editId, form);
    } else {
      await addTodo(form);
    }
    handleClose();
  };

  const handleDelete = async (id) => {
    if (confirm('Bu görevi silmek istediğinize emin misiniz?')) {
      await deleteTodo(id);
    }
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Yapılacaklar
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} size="small">
          Yeni Görev
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">Tümü ({todos.length})</ToggleButton>
          <ToggleButton value="active">Aktif ({todos.filter((t) => !t.completed).length})</ToggleButton>
          <ToggleButton value="completed">Tamamlanan ({todos.filter((t) => t.completed).length})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card>
        <List disablePadding>
          {filteredTodos.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                    {filter === 'completed'
                      ? 'Tamamlanan görev yok'
                      : 'Görev bulunamadı. "Yeni Görev" butonuna tıklayın.'}
                  </Typography>
                }
              />
            </ListItem>
          ) : (
            filteredTodos.map((todo, index) => (
              <ListItem
                key={todo.id}
                divider={index < filteredTodos.length - 1}
                secondaryAction={
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(todo)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(todo.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemIcon>
                  {busyIds.has(todo.id) ? (
                    <CircularProgress size={24} sx={{ m: '9px' }} />
                  ) : (
                    <Checkbox checked={!!todo.completed} onChange={() => toggleTodo(todo.id)} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          color: todo.completed ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {todo.title}
                      </Typography>
                      <Chip
                        label={PRIORITIES.find((p) => p.value === todo.priority)?.label || todo.priority}
                        size="small"
                        color={PRIORITIES.find((p) => p.value === todo.priority)?.color || 'default'}
                      />
                      {todo.category && <Chip label={todo.category} size="small" variant="outlined" />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {todo.description && (
                        <Typography variant="body2" color="text.secondary">
                          {todo.description}
                        </Typography>
                      )}
                      {todo.due_date && (
                        <Typography variant="caption" color="text.secondary">
                          Son tarih: {new Date(todo.due_date).toLocaleDateString('tr-TR')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle>{editId ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Başlık"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Öncelik"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              fullWidth
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kategori"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              fullWidth
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Son Tarih"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.title || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editId ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
