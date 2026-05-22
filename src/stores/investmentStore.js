import { create } from 'zustand';
import { apiGet, apiSend } from '@/lib/apiClient';

const useInvestmentStore = create((set, get) => ({
  investments: [],
  loading: false,
  saving: false,
  busyIds: new Set(),
  error: null,

  fetchInvestments: async () => {
    set({ loading: true, error: null });
    try {
      const investments = await apiGet('/api/investments');
      set({ investments, loading: false });
    } catch (e) {
      console.error('fetchInvestments error:', e);
      set({ loading: false, error: String(e) });
    }
  },

  addInvestment: async (investment) => {
    set({ saving: true });
    try {
      await apiSend('POST', '/api/investments', investment);
      await get().fetchInvestments();
    } catch (e) {
      console.error('addInvestment error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  updateInvestment: async (id, investment) => {
    set({ saving: true });
    try {
      await apiSend('PUT', '/api/investments', { id, ...investment });
      await get().fetchInvestments();
    } catch (e) {
      console.error('updateInvestment error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  deleteInvestment: async (id) => {
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('DELETE', '/api/investments', { id });
      await get().fetchInvestments();
    } catch (e) {
      console.error('deleteInvestment error:', e);
      set({ error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },
}));

export default useInvestmentStore;
