<template>
  <div class="game-lobby">
    <!-- Notificaciones -->
    <div class="notifications-container">
      <transition-group name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification"
          :class="notification.type"
        >
          <span class="notification-icon">
            <svg v-if="notification.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <svg v-else-if="notification.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <svg v-else-if="notification.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </span>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
      </transition-group>
    </div>

    <div class="tab-selector">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'lobby' }"
        @click="activeTab = 'lobby'"
      >{{ $t('lobby.title') }}</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'leaderboard' }"
        @click="switchToLeaderboard"
      >{{ $t('leaderboard.title') }}</button>
    </div>

    <div class="content-grid">
    <div v-show="activeTab === 'lobby'" class="lobby-column">
    <div class="section-heading">{{ $t('lobby.title') }}</div>
    <div v-if="isLoadingWallet" class="loading-section">
      <div class="spinner"></div>
      <p>{{ $t('lobby.loadingWallet') }}</p>
    </div>

    <div v-else-if="!playerAddress" class="wallet-section">
      <div class="wallet-options">
        <h3>{{ $t('lobby.connectWallet') }}</h3>
        <p class="network-badge" :class="{ testnet: isTestnet }">
          {{ isTestnet ? 'TestNet' : 'MainNet' }}
        </p>

        <button @click="createNewWallet" :disabled="isConnecting">
          {{ isConnecting ? $t('lobby.connecting') : $t('lobby.createNewWallet') }}
        </button>

        <button @click="useNamedWallet" :disabled="isConnecting">
          {{ $t('lobby.useSavedWallet') }}
        </button>

        <div class="import-section">
          <input
            v-model="wifInput"
            type="password"
            :placeholder="$t('lobby.importWifPlaceholder')"
          />
          <button @click="importWallet" :disabled="isConnecting || !wifInput">
            {{ $t('lobby.import') }}
          </button>
        </div>

        <label class="testnet-toggle">
          <input type="checkbox" v-model="isTestnet" @change="toggleNetwork" />
          {{ $t('lobby.useTestnet') }}
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
            <p class="nickname-row">
              {{ $t('lobby.user') }}:
              <span v-if="!isEditingNickname" class="nickname-display">{{ nickname }}</span>
              <input
                v-else
                ref="nicknameInput"
                v-model="nickname"
                type="text"
                class="nickname-input"
                maxlength="20"
                @keyup.enter="saveAndCloseNickname"
                @keyup.escape="cancelNicknameEdit"
              />
              <button v-if="!isNicknameLocked && !isEditingNickname" class="nickname-btn" @click="toggleEditNickname">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
              </button>
              <button v-if="isEditingNickname" class="nickname-btn" @click="toggleEditNickname">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              </button>
              <svg v-if="isNicknameLocked && !isEditingNickname" class="locked-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </p>
            <div v-if="showNicknameConfirm" class="nickname-confirm">
              <p class="nickname-confirm-warning">{{ $t('lobby.nicknameWarning') }}</p>
              <div class="nickname-confirm-actions">
                <button class="confirm-btn" @click="signAndSaveNickname">{{ $t('lobby.nicknameConfirm') }}</button>
                <button class="cancel-btn" @click="cancelNicknameEdit">{{ $t('lobby.nicknameCancel') }}</button>
              </div>
            </div>
            <p class="full-address">{{ playerAddress }}</p>
            <p>{{ $t('lobby.balance') }}: {{ balance }} BCH</p>
          </div>
          <QrCode :value="playerAddress" :size="100" />
        </div>
        <div class="wallet-actions">
          <button class="export-btn" @click="toggleShowWIF">
            {{ showWIF ? $t('lobby.hideWif') : $t('lobby.exportWif') }}
          </button>
          <button class="send-btn" @click="toggleShowSend">
            {{ showSend ? $t('lobby.cancelSend') : $t('lobby.withdrawBch') }}
          </button>
          <button class="disconnect-btn" @click="disconnectWallet">{{ $t('lobby.disconnect') }}</button>
        </div>
        <div v-if="showWIF" class="wif-display">
          <p class="wif-warning">{{ $t('lobby.wifWarning') }}</p>
          <code class="wif-code">{{ exportedWIF }}</code>
          <button class="copy-btn" @click="copyWIF">{{ $t('lobby.copy') }}</button>
        </div>
        <div v-if="showSend" class="send-section">
          <div class="send-form">
            <input
              v-model="sendAddress"
              type="text"
              :placeholder="$t('lobby.destAddressPlaceholder')"
              :disabled="isSending"
            />
            <div class="amount-row">
              <input
                v-model.number="sendAmount"
                type="number"
                step="0.00001"
                min="0.00001"
                :placeholder="$t('lobby.amountPlaceholder')"
                :disabled="isSending"
                @input="clearMaxFlag"
              />
              <button class="max-btn" @click="fillMaxAmount" :disabled="isSending">
                Max
              </button>
            </div>
            <button
              @click="sendBCH"
              :disabled="isSending || !sendAddress || !sendAmount || sendAmount <= 0 || sendAmount > balance"
            >
              {{ isSending ? $t('lobby.sending') : $t('lobby.confirmSend') }}
            </button>
          </div>
          <div v-if="sendResult" class="send-success">
            {{ $t('lobby.sent') }}
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
        {{ $t('lobby.testnetNotice') }}
        <a href="https://tbch.googol.cash/" target="_blank">tbch.googol.cash</a>
      </div>

      <div class="create-game">
        <h3>{{ $t('lobby.createGame') }}</h3>
        <input v-model="betAmount" type="number" step="0.0001" min="0.0001" :placeholder="$t('lobby.amountPlaceholder')" />
        <button @click="createLobbyEntry" :disabled="betAmount > balance">
          {{ $t('lobby.publishToLobby') }}
        </button>
      </div>

      <div v-if="myGames.length > 0" class="my-games">
        <h3>{{ $t('lobby.myGames') }}</h3>
        <div v-for="game in myGames" :key="game.id" class="game-item">
          <span>{{ game.amount }} BCH</span>
          <button class="delete-btn" @click="cancelGame(game.id)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="activeMatches.length > 0" class="active-matches">
        <h3>{{ $t('lobby.activeMatches') }}</h3>
        <ActiveMatch
          v-for="match in activeMatches"
          :key="match.matchId"
          :match-id="match.matchId"
          :player-address="playerAddress"
          :nickname="nickname"
          :opponent-nickname="match.opponentNickname"
          :bet-amount="match.betAmount"
          :is-testnet="isTestnet"
          @match-finished="handleMatchFinished"
          @payment-complete="startBalanceWatch"
        />
      </div>

      <div class="available-games">
        <h3>{{ $t('lobby.availableGames') }}</h3>
        <div v-if="availableGames.length === 0" class="no-games">
          {{ $t('lobby.noGames') }}
        </div>
        <div v-for="game in availableGames" :key="game.id" class="game-item">
          <span class="game-nickname">{{ game.nickname || game.address.slice(-10) }}</span>
          <span>{{ game.amount }} BCH</span>
          <button @click="joinGame(game)" :disabled="game.amount > balance">
            {{ $t('lobby.join') }}
          </button>
        </div>
      </div>
    </div>
    </div>

    <div v-show="activeTab === 'leaderboard'" class="leaderboard-section">
      <div class="section-heading">{{ $t('leaderboard.title') }}</div>
      <div v-if="isLoadingLeaderboard" class="loading-section">
        <div class="spinner"></div>
        <p>{{ $t('leaderboard.loading') }}</p>
      </div>
      <div v-else-if="leaderboardEntries.length === 0" class="no-games">
        {{ $t('leaderboard.noEntries') }}
      </div>
      <div v-else class="leaderboard-list">
        <div class="leaderboard-header">
          <span class="lb-rank">#</span>
          <span class="lb-player">{{ $t('leaderboard.player') }}</span>
          <span class="lb-wins">{{ $t('leaderboard.wins') }}</span>
        </div>
        <div
          v-for="(entry, index) in leaderboardEntries"
          :key="entry.address"
          class="leaderboard-item"
          :class="{
            'is-me': entry.address === playerAddress,
            'rank-1': index === 0,
            'rank-2': index === 1,
            'rank-3': index === 2
          }"
        >
          <span class="lb-rank">{{ index + 1 }}</span>
          <span class="lb-player">{{ entry.nickname }}</span>
          <span class="lb-wins">{{ entry.wins }}</span>
        </div>
      </div>
    </div>
    </div><!-- /content-grid -->
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import gunManager from "../lib/gun-manager";
import walletService from "../lib/wallet-service";
import QrCode from "./QrCode.vue";
import ActiveMatch from "./ActiveMatch.vue";

export default {
  name: "GameLobby",
  components: { QrCode, ActiveMatch },
  setup() {
    const { t } = useI18n();
    const playerAddress = ref("");
    const nickname = ref("");
    const isEditingNickname = ref(false);
    const nicknameInput = ref(null);
    const balance = ref(0);
    const betAmount = ref(0.0001);
    const availableGames = ref([]);
    const myGames = ref([]);
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
    const isMaxAmount = ref(false);
    const isSending = ref(false);
    const sendResult = ref("");
    const sendError = ref("");
    const isLoadingWallet = ref(false);
    const notifications = ref([]);
    const isNicknameLocked = ref(false);
    const showNicknameConfirm = ref(false);
    const previousNickname = ref("");
    const activeTab = ref("lobby");
    const leaderboardEntries = ref([]);
    const isLoadingLeaderboard = ref(false);
    const activeMatches = ref([]);
    let leaderboardTimer = null;

    const loadLeaderboardData = async (force = false) => {
      if (!force && leaderboardEntries.value.length > 0) return;
      isLoadingLeaderboard.value = true;
      try {
        leaderboardEntries.value = await gunManager.getLeaderboard();
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        isLoadingLeaderboard.value = false;
      }
    };

    const switchToLeaderboard = async () => {
      activeTab.value = "leaderboard";
      await loadLeaderboardData();
    };

    const showNotification = (message, type = 'info') => {
      const id = Date.now();
      notifications.value.push({ id, message, type });
      setTimeout(() => {
        notifications.value = notifications.value.filter(n => n.id !== id);
      }, 3000);
    };

    const explorerUrl = computed(() =>
      isTestnet.value
        ? "https://chipnet.chaingraph.cash/tx/"
        : "https://blockchair.com/bitcoin-cash/transaction/"
    );

    const isWaiting = computed(() => currentPlayerId.value !== null);

    // Funciones de conexion de wallet
    const createNewWallet = async () => {
      isConnecting.value = true;
      connectionError.value = "";
      try {
        const result = await walletService.createNewWallet();
        await loadNickname(result.address);
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        startBalanceWatch();
      } catch (error) {
        connectionError.value = t('lobby.walletCreateError', { message: error.message });
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
        await loadNickname(result.address);
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        startBalanceWatch();
      } catch (error) {
        connectionError.value = t('lobby.walletLoadError', { message: error.message });
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
        wifInput.value = "";
        await loadNickname(result.address);
        playerAddress.value = result.address;
        balance.value = result.balance.bch;
        startBalanceWatch();
      } catch (error) {
        connectionError.value = t('lobby.walletImportError', { message: error.message });
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
        showNotification(t('lobby.wifCopied'), 'success');
      } catch (error) {
        console.error("Error al copiar:", error);
      }
    };

    const toggleShowSend = () => {
      showSend.value = !showSend.value;
      if (!showSend.value) {
        sendAddress.value = "";
        sendAmount.value = null;
        isMaxAmount.value = false;
        sendResult.value = "";
        sendError.value = "";
      }
    };

    const fillMaxAmount = () => {
      sendAmount.value = balance.value;
      isMaxAmount.value = true;
    };

    const clearMaxFlag = () => {
      isMaxAmount.value = false;
    };

    const sendBCH = async () => {
      sendError.value = "";
      sendResult.value = "";

      if (!sendAddress.value) {
        sendError.value = t('lobby.enterDestAddress');
        return;
      }
      if (!sendAmount.value || sendAmount.value <= 0) {
        sendError.value = t('lobby.enterValidAmount');
        return;
      }
      if (sendAmount.value > balance.value) {
        sendError.value = t('lobby.insufficientBalance');
        return;
      }

      isSending.value = true;
      try {
        let result;
        if (isMaxAmount.value) {
          // Usar sendMax para enviar todo el balance menos el fee
          result = await walletService.sendMax(sendAddress.value);
        } else {
          result = await walletService.send(sendAddress.value, sendAmount.value);
        }
        sendResult.value = result.txId || result.txid || result;
        sendAddress.value = "";
        sendAmount.value = null;
        isMaxAmount.value = false;
        await updateBalance();
        startBalanceWatch();
      } catch (error) {
        sendError.value = t('lobby.sendError', { message: error.message });
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

    const loadNickname = async (address) => {
      // Cargar inmediatamente desde localStorage como caché
      const cached = localStorage.getItem(`rps-bch-nickname-${address}`);
      const cachedLocked = localStorage.getItem(`rps-bch-nickname-locked-${address}`);
      nickname.value = cached || address.slice(-10);
      isNicknameLocked.value = cachedLocked === 'true';

      // Esperar respuesta de GunDB (max 3s) y actualizar si hay diferencia
      const result = await gunManager.getNickname(address);
      if (result.nickname) {
        nickname.value = result.nickname;
        localStorage.setItem(`rps-bch-nickname-${address}`, result.nickname);
      }
      if (result.signature) {
        isNicknameLocked.value = true;
        localStorage.setItem(`rps-bch-nickname-locked-${address}`, 'true');
      }
    };

    const signAndSaveNickname = async () => {
      if (!playerAddress.value || !nickname.value) return;
      try {
        const taken = await gunManager.isNicknameTaken(nickname.value, playerAddress.value);
        if (taken) {
          showNotification(t('lobby.nicknameTaken'), 'error');
          return;
        }
        const signature = await walletService.signMessage(nickname.value);
        await gunManager.saveNickname(playerAddress.value, nickname.value, signature);
        localStorage.setItem(`rps-bch-nickname-${playerAddress.value}`, nickname.value);
        localStorage.setItem(`rps-bch-nickname-locked-${playerAddress.value}`, 'true');
        isNicknameLocked.value = true;
        isEditingNickname.value = false;
        showNicknameConfirm.value = false;
        showNotification(t('lobby.nicknameWarning'), 'success');
      } catch (error) {
        console.error("Error signing nickname:", error);
        showNotification(error.message, 'error');
      }
    };

    const toggleEditNickname = async () => {
      if (isEditingNickname.value) {
        // Mostrar modal de confirmación antes de firmar
        showNicknameConfirm.value = true;
      } else {
        // Abrir edición
        previousNickname.value = nickname.value;
        isEditingNickname.value = true;
        await nextTick();
        nicknameInput.value?.focus();
      }
    };

    const cancelNicknameEdit = () => {
      nickname.value = previousNickname.value;
      isEditingNickname.value = false;
      showNicknameConfirm.value = false;
    };

    const saveAndCloseNickname = () => {
      // Enter key triggers confirmation modal
      showNicknameConfirm.value = true;
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
        showNotification(t('lobby.enterValidAmountAlert'), 'warning');
        return;
      }
      if (!playerAddress.value) {
        showNotification(t('lobby.connectWalletFirst'), 'warning');
        return;
      }
      if (betAmount.value > balance.value) {
        showNotification(t('lobby.insufficientBalanceAlert'), 'error');
        return;
      }

      const playerId = await gunManager.publishToLobby({
        address: playerAddress.value,
        nickname: nickname.value,
        amount: betAmount.value,
      });

      currentPlayerId.value = playerId;
      showNotification(t('lobby.gamePublished'), 'success');
    };

    const joinGame = async (game) => {
      if (!playerAddress.value) {
        showNotification(t('lobby.connectWalletFirst'), 'warning');
        return;
      }
      if (game.amount > balance.value) {
        showNotification(t('lobby.insufficientBalanceForBet'), 'error');
        return;
      }

      let playerBId = currentPlayerId.value;
      if (!playerBId) {
        playerBId = await gunManager.publishToLobby({
          address: playerAddress.value,
          nickname: nickname.value,
          amount: game.amount,
        });
        currentPlayerId.value = playerBId;
      }

      const matchId = await gunManager.createMatch(
        game,
        { id: playerBId, address: playerAddress.value, nickname: nickname.value },
        game.amount
      );

      // Clear before watcher can fire a duplicate
      currentPlayerId.value = null;

      showNotification(t('lobby.gameCreated', { matchId }), 'success');
      activeMatches.value.push({
        matchId,
        opponentNickname: game.nickname || game.address.slice(-10),
        betAmount: game.amount,
      });
    };

    const cancelGame = async (gameId) => {
      await gunManager.cancelLobbyEntry(gameId);
      if (currentPlayerId.value === gameId) {
        currentPlayerId.value = null;
      }
    };

    onMounted(async () => {
      // Restaurar wallet: primero si ya está conectada en memoria, sino desde localStorage
      if (walletService.isConnected()) {
        try {
          playerAddress.value = walletService.getAddress();
          const balanceResult = await walletService.getBalance();
          balance.value = balanceResult.bch;
          await loadNickname(playerAddress.value);
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
          await loadNickname(result.address);
          startBalanceWatch();
        } catch (error) {
          console.error("Error cargando wallet guardada:", error);
        } finally {
          isLoadingWallet.value = false;
        }
      }

      // Escuchar cambios en el lobby
      gunManager.watchLobby((game) => {
        if (game.address === playerAddress.value) {
          // Own games
          if (game.status === "waiting") {
            const exists = myGames.value.findIndex((g) => g.id === game.id);
            if (exists === -1) {
              myGames.value.push(game);
            } else {
              myGames.value[exists] = game;
            }
          } else {
            myGames.value = myGames.value.filter((g) => g.id !== game.id);
          }
        } else if (game.status === "waiting") {
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

      // Pre-load leaderboard for sidebar on tablet/desktop
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        loadLeaderboardData();
      }

      // Auto-refresh leaderboard every 15 seconds
      leaderboardTimer = setInterval(() => loadLeaderboardData(true), 45000);
    });

    onUnmounted(() => {
      if (leaderboardTimer) clearInterval(leaderboardTimer);
    });

    const handleMatchFinished = (matchId) => {
      activeMatches.value = activeMatches.value.filter(
        (m) => m.matchId !== matchId
      );
    };

    // Detectar cuando el jugador A es seleccionado para una partida
    watch(currentPlayerId, (newId) => {
      if (newId) {
        let matched = false;
        gunManager.lobby.get(newId).on((data, key) => {
          if (data && data.status === "matched" && !matched) {
            matched = true;
            console.log(`Jugador A detecta partida ${data.matchId}`);

            // Capture bet amount before async callback clears myGames
            const myGame = myGames.value.find((g) => g.id === newId);
            const betAmount = myGame ? myGame.amount : 0;

            // Resolve opponent nickname from match data
            gunManager.matches.get(data.matchId).once((matchInfo) => {
              if (activeMatches.value.some((m) => m.matchId === data.matchId)) return;
              const opNick = matchInfo && matchInfo.playerB !== playerAddress.value
                ? (matchInfo.nicknameB || matchInfo.playerB?.slice(-10) || "???")
                : (matchInfo?.nicknameA || matchInfo?.playerA?.slice(-10) || "???");
              activeMatches.value.push({
                matchId: data.matchId,
                opponentNickname: opNick,
                betAmount,
              });
            });

            // Clean up
            myGames.value = myGames.value.filter((g) => g.id !== newId);
            currentPlayerId.value = null;
            gunManager.lobby.get(newId).off();
          }
        });
      }
    });

    return {
      playerAddress,
      nickname,
      isEditingNickname,
      nicknameInput,
      balance,
      notifications,
      betAmount,
      availableGames,
      myGames,
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
      clearMaxFlag,
      isNicknameLocked,
      showNicknameConfirm,
      signAndSaveNickname,
      cancelNicknameEdit,
      toggleEditNickname,
      saveAndCloseNickname,
      sendBCH,
      toggleNetwork,
      createLobbyEntry,
      joinGame,
      cancelGame,
      activeTab,
      leaderboardEntries,
      isLoadingLeaderboard,
      switchToLeaderboard,
      activeMatches,
      handleMatchFinished,
      startBalanceWatch,
    };
  },
};
</script>

<style scoped>
/* ===================================================
   GAME LOBBY — UNDERGROUND ARENA DESIGN SYSTEM
   =================================================== */

/* === LAYOUT === */
.game-lobby {
  width: 100%;
  color: var(--text);
  font-family: var(--font-body);
  animation: lobbyReveal 0.4s ease-out;
}

@keyframes lobbyReveal {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

@media (min-width: 768px) {
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    align-items: start;
  }
  /* Override Vue v-show: display:none on tablet/desktop */
  .lobby-column,
  .leaderboard-section {
    display: block !important;
  }
  /* Hide tab selector — section headings take over */
  .tab-selector {
    display: none !important;
  }
  /* Show section headings */
  .section-heading {
    display: flex !important;
    align-items: center;
    gap: 10px;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text);
    padding-bottom: 14px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--border-bright);
  }
  .section-heading::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 14px;
    background: var(--green);
    flex-shrink: 0;
  }
  .leaderboard-section .section-heading::before {
    background: var(--amber);
  }
  /* Hide the CSS-generated SCOREBOARD title inside the list on desktop
     (the section heading above already labels the panel) */
  .leaderboard-list::before {
    display: none;
  }
}

@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr 360px;
    gap: 28px;
  }
}

/* Section heading: hidden on mobile (tabs take over), shown on desktop */
.section-heading {
  display: none;
}

.lobby-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* === SHARED PANEL === */
.wallet-section,
.lobby-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* === LOADING === */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 20px;
  color: var(--text-dim);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-bright);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === TAB SELECTOR (mobile only) === */
.tab-selector {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-bright);
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
  margin-bottom: -1px;
}

.tab-btn:hover:not(:disabled):not(.active) {
  color: var(--text-dim);
  background: var(--surface);
}

.tab-btn.active {
  color: var(--green);
  border-bottom-color: var(--green);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
  background: transparent;
}

/* === WALLET CONNECTION PANEL === */
.wallet-options {
  background: var(--surface);
  border: 1px solid var(--border-bright);
  border-left: 3px solid var(--amber);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wallet-options h3 {
  font-family: var(--font-display);
  font-size: 1.4rem;
  letter-spacing: 0.08em;
  color: var(--amber);
  margin-bottom: 4px;
}

.network-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: normal;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: var(--radius);
  background: var(--green-glow);
  color: var(--green);
  border: 1px solid var(--green);
  width: fit-content;
}

.network-badge.testnet {
  background: var(--amber-glow);
  color: var(--amber);
  border-color: var(--amber);
}

.import-section {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.import-section input {
  flex: 1;
}

.testnet-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-dim);
  cursor: pointer;
  letter-spacing: 0.06em;
}

.testnet-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--amber);
  min-height: unset;
}

.error-message {
  background: var(--red-glow);
  border: 1px solid var(--red);
  color: var(--red);
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

/* === PLAYER INFO === */
.player-info {
  background: var(--surface);
  border: 1px solid var(--border-bright);
  border-left: 3px solid var(--amber);
  padding: 16px;
}

.address-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.address-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-details p {
  margin: 0;
  word-break: break-all;
  font-size: 0.88rem;
  color: var(--text-dim);
  font-family: var(--font-body);
}

.full-address {
  font-family: var(--font-mono) !important;
  font-size: 0.75rem !important;
  color: var(--text-dim) !important;
  letter-spacing: 0.03em;
}

@media (min-width: 480px) {
  .full-address {
    font-size: 0.9rem !important;
    color: var(--text-dim) !important;
  }
}

/* Balance line */
.address-details p:last-of-type {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--amber) !important;
  text-shadow: 0 0 8px rgba(255, 170, 0, 0.3);
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem !important;
  font-family: var(--font-body) !important;
  color: var(--text) !important;
  font-weight: 600;
}

.nickname-display {
  font-weight: 700;
  color: var(--green);
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

.nickname-input {
  padding: 4px 8px;
  background: var(--surface-alt);
  border: 1px solid var(--green);
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  width: 140px;
  border-radius: var(--radius);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.15);
}

.nickname-input:focus {
  outline: none;
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.25);
}

.nickname-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  transition: color 0.2s;
  min-height: unset;
  box-shadow: none;
}

.nickname-btn:hover {
  color: var(--green);
  background: transparent;
  box-shadow: none;
  text-shadow: none;
}

.locked-icon {
  color: var(--amber);
  flex-shrink: 0;
}

.nickname-confirm {
  margin-top: 10px;
  padding: 12px;
  background: var(--amber-glow);
  border: 1px solid var(--amber);
}

.nickname-confirm-warning {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}

.nickname-confirm-actions {
  display: flex;
  gap: 10px;
}

/* === WALLET ACTIONS === */
.wallet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.export-btn {
  padding: 7px 12px;
  font-size: 0.78rem;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border-bright);
}

.export-btn:hover:not(:disabled) {
  color: var(--amber);
  border-color: var(--amber);
  background: var(--amber-glow);
  box-shadow: 0 0 10px rgba(255, 170, 0, 0.2);
  text-shadow: none;
}

.send-btn {
  padding: 7px 12px;
  font-size: 0.78rem;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border-bright);
}

.send-btn:hover:not(:disabled) {
  color: var(--green);
  border-color: var(--green);
  background: var(--green-glow);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
  text-shadow: none;
}

.disconnect-btn {
  padding: 7px 12px;
  font-size: 0.78rem;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border-bright);
}

.disconnect-btn:hover:not(:disabled) {
  color: var(--red);
  border-color: var(--red);
  background: var(--red-glow);
  box-shadow: 0 0 10px rgba(255, 34, 68, 0.2);
  text-shadow: none;
}

/* === WIF DISPLAY === */
.wif-display {
  margin-top: 12px;
  padding: 14px;
  background: var(--amber-glow);
  border: 1px solid var(--amber);
}

.wif-warning {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}

.wif-code {
  display: block;
  background: var(--bg);
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  word-break: break-all;
  color: var(--green);
  margin-bottom: 10px;
  border: 1px solid var(--border-bright);
}

.copy-btn {
  padding: 6px 14px;
  font-size: 0.78rem;
  background: transparent;
  color: var(--amber);
  border: 1px solid var(--amber);
}

.copy-btn:hover:not(:disabled) {
  background: var(--amber-glow-strong);
  box-shadow: 0 0 10px rgba(255, 170, 0, 0.25);
  text-shadow: 0 0 8px rgba(255, 170, 0, 0.4);
}

/* === SEND SECTION === */
.send-section {
  margin-top: 12px;
  padding: 14px;
  background: var(--surface-alt);
  border: 1px solid var(--border-bright);
  border-left: 3px solid var(--green);
}

.send-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.amount-row {
  display: flex;
  gap: 8px;
}

.amount-row input {
  flex: 1;
}

.max-btn {
  padding: 6px 12px;
  font-size: 0.78rem;
  background: transparent;
  color: var(--amber);
  border: 1px solid var(--amber);
  white-space: nowrap;
}

.max-btn:hover:not(:disabled) {
  background: var(--amber-glow);
  box-shadow: 0 0 8px rgba(255, 170, 0, 0.2);
  text-shadow: none;
}

.send-success {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--green-glow);
  border: 1px solid var(--green);
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  word-break: break-all;
}

.send-success a {
  color: var(--green);
  font-weight: bold;
  text-decoration: underline;
}

.send-error {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--red-glow);
  border: 1px solid var(--red);
  color: var(--red);
  font-family: var(--font-mono);
  font-size: 0.78rem;
}

/* === TESTNET NOTICE === */
.testnet-notice {
  background: var(--amber-glow);
  border: 1px solid var(--amber);
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--amber);
  letter-spacing: 0.04em;
}

.testnet-notice a {
  color: var(--amber-dim);
  text-decoration: underline;
  font-weight: bold;
}

/* === CREATE GAME === */
.create-game {
  background: var(--surface);
  border: 1px solid var(--border-bright);
  border-left: 3px solid var(--green);
  padding: 18px 20px;
}

.create-game h3 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 0.08em;
  color: var(--green);
  margin-bottom: 12px;
  text-shadow: 0 0 12px rgba(0, 255, 136, 0.3);
}

.create-game input {
  width: 160px;
  margin-right: 10px;
}

@media (max-width: 480px) {
  .create-game {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .create-game input {
    width: 100%;
    margin-right: 0;
  }
  .create-game button {
    width: 100%;
  }
}

/* === SECTION HEADERS === */
.my-games h3,
.available-games h3,
.active-matches h3 {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.my-games {
  margin-top: 4px;
}

.available-games {
  margin-top: 4px;
}

.active-matches {
  margin-top: 4px;
}

/* === GAME ITEMS === */
.no-games {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 16px 0;
  letter-spacing: 0.06em;
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--amber);
  margin: 6px 0;
  animation: itemFadeIn 0.35s ease-out backwards;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.game-item:nth-child(1) { animation-delay: 0.04s; }
.game-item:nth-child(2) { animation-delay: 0.08s; }
.game-item:nth-child(3) { animation-delay: 0.12s; }
.game-item:nth-child(4) { animation-delay: 0.16s; }
.game-item:nth-child(5) { animation-delay: 0.20s; }

@keyframes itemFadeIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Pulse for available (waiting) games */
.available-games .game-item {
  animation: itemFadeIn 0.35s ease-out backwards, waitingPulse 2.8s ease-in-out infinite;
}

.available-games .game-item:nth-child(1) { animation-delay: 0.04s, 0s; }
.available-games .game-item:nth-child(2) { animation-delay: 0.08s, 0.5s; }
.available-games .game-item:nth-child(3) { animation-delay: 0.12s, 1.0s; }
.available-games .game-item:nth-child(4) { animation-delay: 0.16s, 1.5s; }
.available-games .game-item:nth-child(5) { animation-delay: 0.20s, 2.0s; }

@keyframes waitingPulse {
  0%, 100% { border-left-color: var(--amber); box-shadow: none; }
  50%       { border-left-color: var(--amber-dim); box-shadow: inset 3px 0 8px rgba(255, 170, 0, 0.1); }
}

.game-nickname {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  font-family: var(--font-body);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-item > span:not(.game-nickname) {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--amber);
  white-space: nowrap;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid var(--border-bright);
  cursor: pointer;
  color: var(--text-dim);
  transition: all 0.2s;
  min-height: 40px;
}

.delete-btn:hover {
  color: var(--red);
  border-color: var(--red);
  background: var(--red-glow);
  box-shadow: 0 0 8px rgba(255, 34, 68, 0.2);
}

/* === GLOBAL BUTTON STYLES (scoped) === */
button {
  padding: 10px 18px;
  background: transparent;
  color: var(--green);
  border: 1px solid var(--green);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.2s;
  min-height: 44px;
}

button:hover:not(:disabled) {
  background: var(--green-glow-strong);
  box-shadow: 0 0 14px rgba(0, 255, 136, 0.25);
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

button:disabled {
  color: var(--text-muted);
  border-color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
  text-shadow: none;
}

.confirm-btn {
  padding: 8px 16px;
  font-size: 0.8rem;
}

.cancel-btn {
  padding: 8px 16px;
  font-size: 0.8rem;
  color: var(--text-dim);
  border-color: var(--border-bright);
}

.cancel-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--text-dim);
  background: var(--surface-hover);
  box-shadow: none;
  text-shadow: none;
}

/* === INPUTS (scoped) === */
input[type="text"],
input[type="number"],
input[type="password"] {
  background: var(--surface-alt);
  border: 1px solid var(--border-bright);
  border-radius: var(--radius);
  color: var(--text);
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  min-height: 44px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus,
input[type="number"]:focus,
input[type="password"]:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.15);
}

input[type="text"]:disabled,
input[type="number"]:disabled,
input[type="password"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === NOTIFICATIONS === */
.notifications-container {
  position: fixed;
  top: 70px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 320px;
}

@media (min-width: 480px) {
  .notifications-container {
    max-width: 360px;
    right: 20px;
  }
}

.notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.notification.success {
  background: var(--surface-alt);
  border: 1px solid var(--green);
  color: var(--green);
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.15);
}

.notification.error {
  background: var(--surface-alt);
  border: 1px solid var(--red);
  color: var(--red);
  box-shadow: 0 0 16px rgba(255, 34, 68, 0.15);
}

.notification.warning {
  background: var(--surface-alt);
  border: 1px solid var(--amber);
  color: var(--amber);
  box-shadow: 0 0 16px rgba(255, 170, 0, 0.15);
}

.notification.info {
  background: var(--surface-alt);
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
}

.notification-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
}

.notification-enter-active {
  animation: slideIn 0.3s ease-out;
}

.notification-leave-active {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slideOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
}

/* === LEADERBOARD === */
.leaderboard-section {
  padding: 0;
}

@media (min-width: 768px) {
  .leaderboard-section {
    position: sticky;
    top: 20px;
  }
}

.leaderboard-section > .loading-section {
  padding: 32px 16px;
}

.no-games {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 24px 16px;
  text-align: center;
  letter-spacing: 0.06em;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-bright);
  overflow: hidden;
}

.leaderboard-header {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: normal;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  border-bottom: 1px solid var(--border-bright);
  background: var(--bg);
}

/* Scoreboard title */
.leaderboard-list::before {
  content: 'SCOREBOARD';
  display: block;
  padding: 12px 14px 6px;
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 0.1em;
  color: var(--amber);
  text-shadow: 0 0 12px rgba(255, 170, 0, 0.4);
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.leaderboard-item {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  animation: itemFadeIn 0.35s ease-out backwards;
  position: relative;
  overflow: hidden;
}

.leaderboard-item:last-child {
  border-bottom: none;
}

.leaderboard-item:nth-child(2) { animation-delay: 0.04s; }
.leaderboard-item:nth-child(3) { animation-delay: 0.08s; }
.leaderboard-item:nth-child(4) { animation-delay: 0.12s; }
.leaderboard-item:nth-child(5) { animation-delay: 0.16s; }
.leaderboard-item:nth-child(6) { animation-delay: 0.20s; }
.leaderboard-item:nth-child(7) { animation-delay: 0.24s; }
.leaderboard-item:nth-child(8) { animation-delay: 0.28s; }
.leaderboard-item:nth-child(9) { animation-delay: 0.32s; }
.leaderboard-item:nth-child(10) { animation-delay: 0.36s; }

.leaderboard-item:hover {
  background: var(--surface-hover);
}

.leaderboard-item.is-me {
  background: var(--green-glow);
  border-left: 2px solid var(--green);
}

.leaderboard-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0;
  width: 2px; height: 100%;
  background: var(--border);
}

.leaderboard-item.rank-1::before { background: #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
.leaderboard-item.rank-2::before { background: #b0b8c8; }
.leaderboard-item.rank-3::before { background: #cd7f32; }

.lb-rank {
  width: 44px;
  text-align: center;
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.leaderboard-item.rank-1 .lb-rank {
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.leaderboard-item.rank-2 .lb-rank {
  color: #b0b8c8;
}

.leaderboard-item.rank-3 .lb-rank {
  color: #cd7f32;
  text-shadow: 0 0 8px rgba(205, 127, 50, 0.4);
}

.lb-player {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text);
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leaderboard-item.is-me .lb-player {
  color: var(--green);
}

.lb-wins {
  min-width: 48px;
  text-align: center;
  padding-left: 12px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--amber);
  font-weight: normal;
}
</style>
