import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    player: null,
    currentMatch: null,
    isConnected: false,
  }),

  getters: {
    playerAddress: (state) => state.player?.address || '',
    shortAddress: (state) => {
      const addr = state.player?.address;
      if (!addr) return '';
      return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    }
  },

  actions: {
    setPlayer(player) {
      this.player = player;
    },

    setCurrentMatch(match) {
      this.currentMatch = match;
    },

    connectWallet() {
      // TODO: Implementar conexion real con wallet BCH
      this.player = {
        id: `player-${Date.now()}`,
        address: 'bitcoincash:qz' + Math.random().toString(36).substr(2, 30),
        balance: 0.1
      };
      this.isConnected = true;
    },

    disconnect() {
      this.player = null;
      this.currentMatch = null;
      this.isConnected = false;
    }
  }
});
