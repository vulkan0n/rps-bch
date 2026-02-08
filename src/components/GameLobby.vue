<template>
  <div class="game-lobby">
    <h2>Lobby de Juego</h2>

    <div v-if="isLoadingWallet" class="loading-section">
      <div class="spinner"></div>
      <p>Cargando wallet...</p>
    </div>

    <div v-else-if="!playerAddress" class="wallet-section">
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
        <div class="address-row">
          <div class="address-details">
            <p>Direccion: {{ shortAddress }}</p>
            <p class="full-address">{{ playerAddress }}</p>
            <p>Balance: {{ balance }} BCH</p>
          </div>
          <QrCode :value="playerAddress" :size="100" />
        </div>
        <div class="wallet-actions">
          <button class="export-btn" @click="toggleShowWIF">
            {{ showWIF ? 'Ocultar WIF' : 'Exportar WIF' }}
          </button>
          <button class="send-btn" @click="toggleShowSend">
            {{ showSend ? 'Cancelar Envío' : 'Extraer BCH' }}
          </button>
          <button class="disconnect-btn" @click="disconnectWallet">Desconectar</button>
        </div>
        <div v-if="showWIF" class="wif-display">
          <p class="wif-warning">Guarda esta clave en un lugar seguro. Quien tenga acceso a ella puede controlar tus fondos.</p>
          <code class="wif-code">{{ exportedWIF }}</code>
          <button class="copy-btn" @click="copyWIF">Copiar</button>
        </div>
        <div v-if="showSend" class="send-section">
          <div class="send-form">
            <input
              v-model="sendAddress"
              type="text"
              placeholder="Dirección destino (bitcoincash:...)"
              :disabled="isSending"
            />
            <div class="amount-row">
              <input
                v-model.number="sendAmount"
                type="number"
                step="0.00001"
                min="0.00001"
                placeholder="Cantidad BCH"
                :disabled="isSending"
              />
              <button class="max-btn" @click="fillMaxAmount" :disabled="isSending">
                Max
              </button>
            </div>
            <button
              @click="sendBCH"
              :disabled="isSending || !sendAddress || !sendAmount || sendAmount <= 0 || sendAmount > balance"
            >
              {{ isSending ? 'Enviando...' : 'Confirmar Envío' }}
            </button>
          </div>
          <div v-if="sendResult" class="send-success">
            Enviado! TX:
            <a :href="explorerUrl + sendResult" target="_blank">
              {{ sendResult.slice(0, 20) }}...
            </a>
          </div>
          <div v-if="sendError" class="send-error">
            {{ sendError }}
          </div>
        </div>
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
import QrCode from "./QrCode.vue";

export default {
  name: "GameLobby",
  components: { QrCode },
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
    const showWIF = ref(false);
    const exportedWIF = ref("");
    const showSend = ref(false);
    const sendAddress = ref("");
    const sendAmount = ref(null);
    const isSending = ref(false);
    const sendResult = ref("");
    const sendError = ref("");
    const isLoadingWallet = ref(false);

    const explorerUrl = computed(() =>
      isTestnet.value
        ? "https://chipnet.chaingraph.cash/tx/"
        : "https://blockchair.com/bitcoin-cash/transaction/"
    );

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
      showWIF.value = false;
      exportedWIF.value = "";
    };

    const toggleShowWIF = () => {
      if (!showWIF.value) {
        exportedWIF.value = walletService.exportWIF();
      }
      showWIF.value = !showWIF.value;
    };

    const copyWIF = async () => {
      try {
        await navigator.clipboard.writeText(exportedWIF.value);
        alert("WIF copiado al portapapeles");
      } catch (error) {
        console.error("Error al copiar:", error);
      }
    };

    const toggleShowSend = () => {
      showSend.value = !showSend.value;
      if (!showSend.value) {
        sendAddress.value = "";
        sendAmount.value = null;
        sendResult.value = "";
        sendError.value = "";
      }
    };

    const fillMaxAmount = () => {
      sendAmount.value = balance.value;
    };

    const sendBCH = async () => {
      sendError.value = "";
      sendResult.value = "";

      if (!sendAddress.value) {
        sendError.value = "Ingresa una dirección destino";
        return;
      }
      if (!sendAmount.value || sendAmount.value <= 0) {
        sendError.value = "Ingresa una cantidad válida";
        return;
      }
      if (sendAmount.value > balance.value) {
        sendError.value = "Balance insuficiente";
        return;
      }

      isSending.value = true;
      try {
        const result = await walletService.send(sendAddress.value, sendAmount.value);
        sendResult.value = result.txId || result.txid || result;
        sendAddress.value = "";
        sendAmount.value = null;
        await updateBalance();
        startBalanceWatch();
      } catch (error) {
        sendError.value = `Error al enviar: ${error.message}`;
        console.error("Error enviando BCH:", error);
      } finally {
        isSending.value = false;
      }
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

    onMounted(async () => {
      // Restaurar wallet: primero si ya está conectada en memoria, sino desde localStorage
      if (walletService.isConnected()) {
        try {
          playerAddress.value = walletService.getAddress();
          const balanceResult = await walletService.getBalance();
          balance.value = balanceResult.bch;
          startBalanceWatch();
        } catch (error) {
          console.error("Error restaurando wallet:", error);
        }
      } else if (walletService.hasSavedWallet()) {
        isLoadingWallet.value = true;
        try {
          const result = await walletService.getNamedWallet("rps-bch-player");
          playerAddress.value = result.address;
          balance.value = result.balance.bch;
          startBalanceWatch();
        } catch (error) {
          console.error("Error cargando wallet guardada:", error);
        } finally {
          isLoadingWallet.value = false;
        }
      }

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
      showWIF,
      exportedWIF,
      showSend,
      sendAddress,
      sendAmount,
      isSending,
      sendResult,
      sendError,
      explorerUrl,
      isLoadingWallet,
      createNewWallet,
      useNamedWallet,
      importWallet,
      disconnectWallet,
      toggleShowWIF,
      copyWIF,
      toggleShowSend,
      fillMaxAmount,
      sendBCH,
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
  color: #1a1a1a;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #4caf50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.wallet-section,
.lobby-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 10px;
  color: #1a1a1a;
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
  border: 1px solid #aaa;
  border-radius: 5px;
  color: #1a1a1a;
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
}

.address-row {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.address-details {
  flex: 1;
  min-width: 0;
}

.address-details p {
  margin: 5px 0;
  word-break: break-all;
}

.full-address {
  font-size: 0.75rem;
  color: #333;
  font-family: monospace;
}

.player-info p {
  margin: 5px 0;
  word-break: break-all;
}

.wallet-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.export-btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  background: #1976d2;
}

.export-btn:hover {
  background: #1565c0;
}

.disconnect-btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  background: #ef5350;
}

.disconnect-btn:hover {
  background: #e53935;
}

.wif-display {
  margin-top: 15px;
  padding: 10px;
  background: #fff8e1;
  border: 1px solid #ffb300;
  border-radius: 5px;
}

.wif-warning {
  color: #e65100;
  font-size: 0.85rem;
  margin-bottom: 10px;
}

.wif-code {
  display: block;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  word-break: break-all;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.copy-btn {
  padding: 5px 15px;
  font-size: 0.8rem;
  background: #ff9800;
}

.copy-btn:hover {
  background: #f57c00;
}

.send-btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  background: #2e7d32;
}

.send-btn:hover {
  background: #1b5e20;
}

.send-section {
  margin-top: 15px;
  padding: 10px;
  background: #e8f5e9;
  border: 1px solid #66bb6a;
  border-radius: 5px;
}

.send-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.send-form input {
  padding: 8px;
  border: 1px solid #aaa;
  border-radius: 5px;
  color: #1a1a1a;
  font-size: 0.9rem;
}

.amount-row {
  display: flex;
  gap: 8px;
}

.amount-row input {
  flex: 1;
}

.max-btn {
  padding: 5px 12px;
  font-size: 0.8rem;
  background: #ff9800;
}

.max-btn:hover {
  background: #f57c00;
}

.send-success {
  margin-top: 10px;
  padding: 8px;
  background: #c8e6c9;
  border-radius: 5px;
  color: #2e7d32;
  font-size: 0.85rem;
  word-break: break-all;
}

.send-success a {
  color: #1b5e20;
  font-weight: bold;
}

.send-error {
  margin-top: 10px;
  padding: 8px;
  background: #ffebee;
  border-radius: 5px;
  color: #c62828;
  font-size: 0.85rem;
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
  border: 1px solid #aaa;
  border-radius: 5px;
  color: #1a1a1a;
}

.available-games {
  margin-top: 20px;
}

.available-games h3 {
  margin-bottom: 10px;
}

.no-games {
  color: #444;
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
  color: #1a1a1a;
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
