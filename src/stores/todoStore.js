import { create } from 'zustand';
import { apiGet, apiSend } from '@/lib/apiClient';

const useTodoStore = create((set, get) => ({
  todos: [],
  loading: false,
  saving: false,
  busyIds: new Set(),
  error: null,

  fetchTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await apiGet('/api/todos');
      set({ todos, loading: false });
    } catch (e) {
      console.error('fetchTodos error:', e);
      set({ loading: false, error: String(e) });
    }
  },

  addTodo: async (todo) => {
    set({ saving: true });
    try {
      await apiSend('POST', '/api/todos', todo);
      await get().fetchTodos();
    } catch (e) {
      console.error('addTodo error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  updateTodo: async (id, todo) => {
    set({ saving: true });
    try {
      await apiSend('PUT', '/api/todos', { id, ...todo });
      await get().fetchTodos();
    } catch (e) {
      console.error('updateTodo error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  deleteTodo: async (id) => {
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('DELETE', '/api/todos', { id });
      await get().fetchTodos();
    } catch (e) {
      console.error('deleteTodo error:', e);
      set({ error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },

  toggleTodo: async (id) => {
    const prev = get().todos;
    set({
      todos: prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    });
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('POST', '/api/todos-toggle', { id });
      await get().fetchTodos();
    } catch (e) {
      console.error('toggleTodo error:', e);
      set({ todos: prev, error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },
}));

export default useTodoStore;
