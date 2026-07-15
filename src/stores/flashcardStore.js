import { create } from 'zustand';
import { apiGet, apiSend } from '@/lib/apiClient';

const useFlashcardStore = create((set, get) => ({
  decks: [],
  loading: false,
  saving: false,
  busyIds: new Set(),
  error: null,

  cards: [],
  cardsDeckId: null,
  cardsLoading: false,

  stats: null,
  statsLoading: false,

  /* ---------------- Decks ---------------- */

  fetchDecks: async () => {
    set({ loading: true, error: null });
    try {
      const decks = await apiGet('/api/decks');
      set({ decks, loading: false });
    } catch (e) {
      console.error('fetchDecks error:', e);
      set({ loading: false, error: String(e) });
    }
  },

  addDeck: async (deck) => {
    set({ saving: true });
    try {
      const res = await apiSend('POST', '/api/decks', deck);
      await get().fetchDecks();
      set({ saving: false });
      return res;
    } catch (e) {
      console.error('addDeck error:', e);
      set({ saving: false, error: String(e) });
      return null;
    }
  },

  updateDeck: async (id, deck) => {
    set({ saving: true });
    try {
      await apiSend('PUT', '/api/decks', { id, ...deck });
      await get().fetchDecks();
    } catch (e) {
      console.error('updateDeck error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  deleteDeck: async (id) => {
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('DELETE', '/api/decks', { id });
      await get().fetchDecks();
    } catch (e) {
      console.error('deleteDeck error:', e);
      set({ error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },

  /* ---------------- Cards ---------------- */

  fetchCards: async (deckId) => {
    set({ cardsLoading: true, cardsDeckId: deckId, error: null });
    try {
      const cards = await apiGet(`/api/flashcards?deckId=${deckId}`);
      set({ cards, cardsLoading: false });
    } catch (e) {
      console.error('fetchCards error:', e);
      set({ cardsLoading: false, error: String(e) });
    }
  },

  addCard: async (deckId, card) => {
    set({ saving: true });
    try {
      await apiSend('POST', '/api/flashcards', { deckId, ...card });
      await get().fetchCards(deckId);
      get().fetchDecks();
    } catch (e) {
      console.error('addCard error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  addCards: async (deckId, cards) => {
    set({ saving: true });
    try {
      const res = await apiSend('POST', '/api/flashcards', { deckId, cards });
      await get().fetchCards(deckId);
      get().fetchDecks();
      set({ saving: false });
      return res;
    } catch (e) {
      console.error('addCards error:', e);
      set({ saving: false, error: String(e) });
      return null;
    }
  },

  updateCard: async (deckId, id, card) => {
    set({ saving: true });
    try {
      await apiSend('PUT', '/api/flashcards', { id, ...card });
      await get().fetchCards(deckId);
    } catch (e) {
      console.error('updateCard error:', e);
      set({ error: String(e) });
    }
    set({ saving: false });
  },

  deleteCard: async (deckId, id) => {
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('DELETE', '/api/flashcards', { id });
      await get().fetchCards(deckId);
      get().fetchDecks();
    } catch (e) {
      console.error('deleteCard error:', e);
      set({ error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },

  resetCard: async (deckId, id) => {
    const busyIds = new Set(get().busyIds);
    busyIds.add(id);
    set({ busyIds });
    try {
      await apiSend('POST', '/api/flashcards/reset', { id });
      await get().fetchCards(deckId);
      get().fetchDecks();
    } catch (e) {
      console.error('resetCard error:', e);
      set({ error: String(e) });
    }
    const after = new Set(get().busyIds);
    after.delete(id);
    set({ busyIds: after });
  },

  /* ---------------- Study & stats ---------------- */

  fetchStudyQueue: async (deckId, cram = false) => {
    return apiGet(`/api/flashcards/study?deckId=${deckId}${cram ? '&cram=1' : ''}`);
  },

  reviewCard: async (id, rating) => {
    return apiSend('POST', '/api/flashcards/review', { id, rating });
  },

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await apiGet('/api/flashcards/stats');
      set({ stats, statsLoading: false });
    } catch (e) {
      console.error('fetchStats error:', e);
      set({ statsLoading: false, error: String(e) });
    }
  },
}));

export default useFlashcardStore;
