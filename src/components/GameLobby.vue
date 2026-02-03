<template>
  <div class="game-lobby">
    <h2>Lobby de Juego</h2>

    <div v-if="!playerAddress" class="wallet-section">
      <div class="wallet-options">
        <h3>Conectar Wallet</h3>
        <p class="network-badge" :class="{ testnet: isTestnet }">
          {{ isTestnet ? 'TestNet' : 'MainNet' }}
        </p>

        <button @click="createNewWallet" :disabled="isConnecting">
          {{ isConnecting ? 'Conectando...' : 'Crear Wallet Nueva' }}
        </button>

        <button @click="useNamedWallet" :disabled="isConnecting">
          Usar Wallet Guardada
        </button>

        <div class="import-section">
          <input
            v-model="wifInput"
            type="password"
            placeholder="Importar WIF (clave privada)"
          />
          <button @click="importWallet" :disabled="isConnecting || !wifInput">
            Importar
          </button>
        </div>

        <label class="testnet-toggle">
          <input type="checkbox" v-model="isTestnet" @change="toggleNetwork" />
          Usar TestNet (recomendado para pruebas)
        </label>
      </div>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>
    </div>

    <div v-else class="lobby-section">
      <div class="player-info">
        <p>Direccion: {{ shortAddress }}</p>
        <p>Balance: {{ balance }} BCH</p>
        <button class="disconnect-btn" @click="disconnectWallet">Desconectar</button>
      </div>

      <div v-if="isTestnet" class="testnet-notice">
        Estas en TestNet. Puedes obtener BCH de prueba en:
        <a href="https://tbch.googol.cash/" target="_blank">tbch.googol.cash</a>
      </div>

      <div class="create-game">
        <h3>Crear Partida</h3>
        <input v-model="betAmount" type="number" step="0.001" min="0.001" placeholder="Cantidad BCH" />
        <button @click="createLobbyEntry" :disabled="betAmount > balance">
          Publicar en Lobby
        </button>
      </div>

      <div class="available-games">
        <h3>Partidas Disponibles</h3>
        <div v-if="availableGames.length === 0" class="no-games">
          No hay partidas disponibles
        </div>
        <div v-for="game in availableGames" :key="game.id" class="game-item">
          <span>{{ game.address.slice(0, 15) }}...</span>
          <span>{{ game.amount }} BCH</span>
          <button @click="joinGame(game)" :disabled="game.amount > balance">
            Unirse
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from "vue";
import gunManager from "../lib/gun-manager";
import walletService from "../lib/wallet-service";

export default {
  name: "GameLobby",
  emits: ["match-created"],
  setup(props, { emit }) {
    const playerAddress = ref("");
    const balance = ref(0);
    const betAmount = ref(0.001);
    const availableGames = ref([]);
    const currentPlayerId = ref(null);
    const isConnecting = ref(false);
    const connectionError = ref("");
    const wifInput = ref("");
    const isTestnet = ref(false);

    const shortAddress = computed(() => {
      if (!playerAddress.value) return "";
      return `${playerAddress.value.slice(0, 15)}...${playerAddress.value.slice(-8)}`;
    });

    const isWaiting = computed(() => currentPlayerId.value !== null);

    // Funciones de conexion de wallet
    const createNewWallet = async () => {
      isConnecting.value = true;
      connectionError.value = "";
      try {
        const result = await walletService.createNewWallet();
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        startBalanceWatch();
      } catch (error) {
        connectionError.value = `Error al crear wallet: ${error.message}`;
        console.error(error);
      } finally {
        isConnecting.value = false;
      }
    };

    const useNamedWallet = async () => {
      isConnecting.value = true;
      connectionError.value = "";
      try {
        const result = await walletService.getNamedWallet("rps-bch-player");
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        startBalanceWatch();
      } catch (error) {
        connectionError.value = `Error al cargar wallet: ${error.message}`;
        console.error(error);
      } finally {
        isConnecting.value = false;
      }
    };

    const importWallet = async () => {
      if (!wifInput.value) return;
      isConnecting.value = true;
      connectionError.value = "";
      try {
        const result = await walletService.importFromWIF(wifInput.value);
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        wifInput.value = "";
        startBalanceWatch();
      } catch (error) {
        connectionError.value = `Error al importar wallet: ${error.message}`;
        console.error(error);
      } finally {
        isConnecting.value = false;
      }
    };

    const disconnectWallet = () => {
      walletService.disconnect();
      playerAddress.value = "";
      balance.value = 0;
      currentPlayerId.value = null;
    };

    const toggleNetwork = () => {
      walletService.setTestnet(isTestnet.value);
      if (playerAddress.value) {
        disconnectWallet();
      }
    };

    const startBalanceWatch = () => {
      walletService.watchBalance(async (newBalance) => {
        balance.value = Number(newBalance) / 100_000_000;
      });
    };

    const updateBalance = async () => {
      if (walletService.isConnected()) {
        const result = await walletService.getBalance();
        balance.value = result.bch;
      }
    };

    // Funciones del lobby
    const createLobbyEntry = async () => {
      if (!betAmount.value || betAmount.value <= 0) {
        alert("Ingresa una cantidad valida");
        return;
      }
      if (!playerAddress.value) {
        alert("Conecta tu wallet primero.");
        return;
      }
      if (betAmount.value > balance.value) {
        alert("Balance insuficiente");
        return;
      }

      const playerId = await gunManager.publishToLobby({
        address: playerAddress.value,
        amount: betAmount.value,
      });

      currentPlayerId.value = playerId;
      alert("Partida publicada! Esperando oponente...");
    };

    const joinGame = async (game) => {
      if (!playerAddress.value) {
        alert("Conecta tu wallet primero.");
        return;
      }
      if (game.amount > balance.value) {
        alert("Balance insuficiente para esta apuesta");
        return;
      }

      let playerBId = currentPlayerId.value;
      if (!playerBId) {
        playerBId = await gunManager.publishToLobby({
          address: playerAddress.value,
          amount: game.amount,
        });
        currentPlayerId.value = playerBId;
      }

      const matchId = await gunManager.createMatch(
        game,
        { id: playerBId, address: playerAddress.value },
        game.amount
      );

      alert(`Partida creada! ID: ${matchId}`);
      emit("match-created", matchId);
    };

    onMounted(() => {
      // Escuchar cambios en el lobby
      gunManager.watchLobby((game) => {
        if (game.address !== playerAddress.value && game.status === "waiting") {
          const exists = availableGames.value.findIndex((g) => g.id === game.id);

          if (exists === -1) {
            availableGames.value.push(game);
          } else {
            availableGames.value[exists] = game;
          }
        } else {
          availableGames.value = availableGames.value.filter((g) => g.id !== game.id);
        }
      });

      // Actualizar balance periodicamente
      setInterval(updateBalance, 30000);
    });

    // Detectar cuando el jugador A es seleccionado para una partida
    watch(currentPlayerId, (newId) => {
      if (newId) {
        gunManager.lobby.get(newId).on((data, key) => {
          if (data && data.status === "matched") {
            console.log(`Jugador A detecta partida ${data.matchId}`);
            emit("match-created", data.matchId);
            gunManager.lobby.get(newId).off();
          }
        });
      }
    });

    return {
      playerAddress,
      balance,
      betAmount,
      availableGames,
      shortAddress,
      isWaiting,
      isConnecting,
      connectionError,
      wifInput,
      isTestnet,
      createNewWallet,
      useNamedWallet,
      importWallet,
      disconnectWallet,
      toggleNetwork,
      createLobbyEntry,
      joinGame,
    };
  },
};
</script>

<style scoped>
.game-lobby {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.wallet-section,
.lobby-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 10px;
}

.wallet-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wallet-options h3 {
  margin-bottom: 10px;
}

.network-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  background: #4caf50;
  color: white;
}

.network-badge.testnet {
  background: #ff9800;
}

.import-section {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.import-section input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.testnet-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.9rem;
  cursor: pointer;
}

.testnet-toggle input {
  cursor: pointer;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 5px;
  margin-top: 10px;
}

.player-info {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  position: relative;
}

.player-info p {
  margin: 5px 0;
  word-break: break-all;
}

.disconnect-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 10px;
  font-size: 0.8rem;
  background: #ef5350;
}

.disconnect-btn:hover {
  background: #e53935;
}

.testnet-notice {
  background: #fff3e0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.testnet-notice a {
  color: #e65100;
}

.create-game {
  margin-bottom: 20px;
}

.create-game h3 {
  margin-bottom: 10px;
}

.create-game input {
  width: 150px;
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.available-games {
  margin-top: 20px;
}

.available-games h3 {
  margin-bottom: 10px;
}

.no-games {
  color: #666;
  font-style: italic;
  padding: 10px;
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  margin: 10px 0;
  border-radius: 5px;
}

button {
  padding: 10px 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
