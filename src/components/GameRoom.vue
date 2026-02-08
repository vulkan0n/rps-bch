<template>
  <div class="game-room">
    <div class="game-container">
      <h2>{{ $t('room.title') }}</h2>
      <p class="match-id">Match ID: {{ matchId }}</p>

      <div v-if="!roleDetected" class="loading-phase">
        <div class="spinner"></div>
        <p>{{ $t('room.connectingToMatch') }}</p>
      </div>

      <div v-else-if="gamePhase === 'selecting'" class="selection-phase">
        <h3>{{ $t('room.chooseMove') }}</h3>
        <p class="role-info">{{ $t('room.youArePlayer', { role: playerRole }) }}</p>
        <div class="moves">
          <button
            v-for="(move, index) in moves"
            :key="move"
            @click="selectMove(index)"
            class="move-btn"
            :class="{ selected: selectedMove === index }"
          >
            <span class="move-icon">{{ moveIcons[index] }}</span>
            <span class="move-name">{{ $t('moves.' + move) }}</span>
          </button>
        </div>

        <button v-if="selectedMove !== null" @click="commitMove" class="commit-btn">
          {{ $t('room.confirmMove') }}
        </button>
      </div>

      <div v-else-if="gamePhase === 'waiting'" class="waiting-phase">
        <div class="spinner"></div>
        <p>{{ $t('room.waitingForOpponent') }}</p>
        <p class="commit-status">{{ $t('room.yourCommit') }}: {{ playerCommit?.substring(0, 10) }}...</p>
      </div>

      <div v-else-if="gamePhase === 'revealing'" class="reveal-phase">
        <h3>{{ $t('room.revealPhase') }}</h3>
        <button @click="revealMove" class="reveal-btn">{{ $t('room.revealMove') }}</button>
      </div>

      <div v-else-if="gamePhase === 'result'" class="result-phase">
        <h3>{{ $t('room.result') }}</h3>
        <p class="role-info">{{ $t('room.youArePlayer', { role: playerRole }) }}</p>
        <div class="result-display">
          <div class="player-result">
            <p>{{ $t('room.you') }}</p>
            <span class="result-icon">{{ moveIcons[playerMove] }}</span>
          </div>
          <div class="vs">VS</div>
          <div class="player-result">
            <p>{{ $t('room.opponent') }}</p>
            <span class="result-icon">{{ moveIcons[opponentMove] }}</span>
          </div>
        </div>
        <p class="winner-text">{{ resultMessage }}</p>

        <div v-if="matchData" class="bet-info">
          {{ $t('room.bet') }}: {{ matchData.amount }} BCH
        </div>

        <div v-if="paymentStatus" class="payment-status">
          <div v-if="paymentStatus === 'processing'" class="payment-processing">
            <div class="spinner-small"></div>
            <span>{{ $t('room.sendingPayment') }}</span>
          </div>
          <div v-else-if="paymentStatus === 'completed'" class="payment-success">
            {{ $t('room.paymentSent') }}
            <a v-if="explorerUrl" :href="explorerUrl" target="_blank" class="tx-link">
              {{ $t('room.viewTransaction') }}
            </a>
          </div>
          <div v-else-if="paymentStatus === 'waiting_payment'" class="payment-waiting">
            {{ $t('room.waitingForPayment') }}
          </div>
          <div v-else-if="paymentStatus === 'received'" class="payment-success">
            {{ $t('room.paymentReceived') }}
            <a v-if="explorerUrl" :href="explorerUrl" target="_blank" class="tx-link">
              {{ $t('room.viewTransaction') }}
            </a>
          </div>
          <div v-else-if="paymentStatus === 'error'" class="payment-error">
            {{ paymentError }}
          </div>
        </div>

        <button @click="endMatch" class="back-btn">{{ $t('room.backToLobby') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import gunManager from "../lib/gun-manager";
import walletService from "../lib/wallet-service";
import {
  MOVES,
  MOVE_NAMES,
  generateSecret,
  createCommit,
  determineWinner,
  verifyReveal,
} from "../lib/game-logic";

export default {
  name: "GameRoom",
  props: {
    matchId: {
      type: String,
      required: true,
    },
  },
  emits: ["match-ended"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const moves = ref(MOVE_NAMES);
    const moveIcons = ref(["🪨", "📄", "✂️"]);
    const gamePhase = ref("selecting");
    const selectedMove = ref(null);
    const playerSecret = ref("");
    const playerCommit = ref("");
    const playerMove = ref(null);
    const opponentMove = ref(null);
    const opponentCommit = ref(null);
    const resultMessage = ref("");
    const playerRole = ref(null);
    const roleDetected = ref(false);
    const matchData = ref(null);
    const paymentStatus = ref("");
    const paymentError = ref("");
    const paymentTxId = ref("");

    const explorerUrl = computed(() => {
      if (!paymentTxId.value) return "";
      const isTestnet = walletService.isTestnet;
      const base = isTestnet
        ? "https://blockchair.com/bitcoin-cash/testnet/transaction/"
        : "https://blockchair.com/bitcoin-cash/transaction/";
      return base + paymentTxId.value;
    });

    const selectMove = (index) => {
      selectedMove.value = index;
    };

    const commitMove = async () => {
      if (selectedMove.value === null) return;

      playerSecret.value = generateSecret();
      playerCommit.value = createCommit(selectedMove.value, playerSecret.value);
      playerMove.value = selectedMove.value;

      await gunManager.sendCommit(props.matchId, playerRole.value, playerCommit.value);

      gamePhase.value = "waiting";
    };

    const revealMove = async () => {
      await gunManager.sendReveal(props.matchId, playerRole.value, playerMove.value, playerSecret.value);
      // El resultado se calculara cuando ambos reveals esten disponibles
    };

    const calculateResult = async (myMove, theirMove) => {
      // determineWinner espera (moveA, moveB) en ese orden
      const moveA = playerRole.value === "A" ? myMove : theirMove;
      const moveB = playerRole.value === "A" ? theirMove : myMove;
      const winner = determineWinner(moveA, moveB);

      if (winner === "draw") {
        resultMessage.value = t('room.draw');
      } else if (
        (playerRole.value === "A" && winner === "playerA") ||
        (playerRole.value === "B" && winner === "playerB")
      ) {
        resultMessage.value = t('room.youWin');
        // El oponente debe pagarme - esperamos que su cliente lo haga
        paymentStatus.value = "waiting_payment";
      } else {
        resultMessage.value = t('room.youLose');
        // Yo perdí, debo pagar al ganador
        await processPayment();
      }

      gamePhase.value = "result";
    };

    const processPayment = async () => {
      if (!matchData.value || !matchData.value.amount) {
        paymentError.value = t('room.matchDataError');
        return;
      }

      const amount = parseFloat(matchData.value.amount);
      const winnerAddress = playerRole.value === "A"
        ? matchData.value.playerB
        : matchData.value.playerA;

      paymentStatus.value = "processing";

      try {
        const result = await walletService.send(winnerAddress, amount);
        paymentStatus.value = "completed";
        paymentTxId.value = result.txid;
        console.log("Pago enviado:", result.txid);

        // Notificar el pago via GunDB
        await gunManager.matches.get(props.matchId).put({
          paymentTxId: result.txid,
          paymentFrom: playerRole.value,
          paymentTime: Date.now()
        });
      } catch (error) {
        paymentStatus.value = "error";
        paymentError.value = t('room.paymentError', { message: error.message });
        console.error("Error en pago:", error);
      }
    };

    const endMatch = () => {
      emit("match-ended");
    };

    onMounted(() => {
      const myAddress = walletService.getAddress();

      gunManager.watchMatch(props.matchId, (data) => {
        console.log("Match update:", data);

        // Guardar datos del match para el pago
        if (data.amount && data.playerA && data.playerB) {
          matchData.value = {
            amount: data.amount,
            playerA: data.playerA,
            playerB: data.playerB
          };
        }

        // Detectar rol del jugador comparando direcciones (solo una vez)
        if (data.playerA && data.playerB && !roleDetected.value) {
          if (data.playerB === myAddress) {
            playerRole.value = "B";
            console.log("Detectado como jugador B");
          } else {
            playerRole.value = "A";
            console.log("Detectado como jugador A");
          }
          roleDetected.value = true;
        }

        // Detectar pago recibido
        if (data.paymentTxId && paymentStatus.value === "waiting_payment") {
          paymentStatus.value = "received";
          paymentTxId.value = data.paymentTxId;
          console.log("Pago recibido:", data.paymentTxId);
        }

        // No procesar si aún no se detecta el rol
        if (!roleDetected.value) return;

        const opponentCommitKey = playerRole.value === "A" ? "commitBHash" : "commitAHash";
        const playerCommitKey = playerRole.value === "A" ? "commitAHash" : "commitBHash";
        const opponentRevealMoveKey = playerRole.value === "A" ? "revealBMove" : "revealAMove";
        const opponentRevealSecretKey = playerRole.value === "A" ? "revealBSecret" : "revealASecret";
        const playerRevealMoveKey = playerRole.value === "A" ? "revealAMove" : "revealBMove";

        const opponentCommitted = !!data[opponentCommitKey];
        const playerCommitted = !!data[playerCommitKey];

        if (opponentCommitted) {
          opponentCommit.value = data[opponentCommitKey];
        }

        // Cambiar a fase de revelacion cuando ambos hayan hecho commit
        if (playerCommitted && opponentCommitted && gamePhase.value === "waiting") {
          gamePhase.value = "revealing";
        }

        // Detectar reveals y calcular resultado
        const opponentRevealed = data[opponentRevealMoveKey] !== undefined;
        const playerRevealed = data[playerRevealMoveKey] !== undefined;

        if (opponentRevealed && playerRevealed && gamePhase.value !== "result") {
          const theirMove = data[opponentRevealMoveKey];
          const theirSecret = data[opponentRevealSecretKey];

          // Verificar que el reveal del oponente coincide con su commit
          if (verifyReveal(theirMove, theirSecret, opponentCommit.value)) {
            opponentMove.value = theirMove;
            calculateResult(playerMove.value, opponentMove.value);
          } else {
            resultMessage.value = t('room.opponentCheated');
            gamePhase.value = "result";
          }
        }
      });
    });

    return {
      moves,
      moveIcons,
      gamePhase,
      selectedMove,
      playerCommit,
      playerMove,
      opponentMove,
      resultMessage,
      roleDetected,
      playerRole,
      matchData,
      paymentStatus,
      paymentError,
      paymentTxId,
      explorerUrl,
      selectMove,
      commitMove,
      revealMove,
      endMatch,
    };
  },
};
</script>

<style scoped>
.game-room {
  width: 100%;
  max-width: 800px;
}

.game-container {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  color: #1a1a1a;
}

.match-id {
  background: #f0f0f0;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  font-family: monospace;
  margin-bottom: 2rem;
}

.moves {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
}

.move-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border: 3px solid #e0e0e0;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s;
  color: #1a1a1a;
}

.move-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.move-btn.selected {
  border-color: #4caf50;
  background: #e8f5e9;
}

.move-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.move-name {
  font-size: 1.1rem;
  text-transform: capitalize;
}

.commit-btn,
.reveal-btn,
.back-btn {
  display: block;
  margin: 2rem auto;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.3s;
}

.commit-btn:hover,
.reveal-btn:hover,
.back-btn:hover {
  transform: scale(1.05);
}

.waiting-phase,
.loading-phase {
  text-align: center;
  padding: 3rem;
}

.role-info {
  color: #444;
  margin-bottom: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #764ba2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.commit-status {
  font-family: monospace;
  color: #333;
  margin-top: 1rem;
}

.result-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3rem;
  margin: 2rem 0;
}

.player-result {
  text-align: center;
}

.result-icon {
  font-size: 4rem;
  display: block;
  margin: 1rem 0;
}

.vs {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.winner-text {
  font-size: 2rem;
  text-align: center;
  margin: 2rem 0;
  font-weight: bold;
}

.bet-info {
  text-align: center;
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 1rem;
}

.payment-status {
  text-align: center;
  padding: 1rem;
  border-radius: 10px;
  margin: 1rem 0;
}

.payment-processing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #1976d2;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.payment-success {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1rem;
  border-radius: 8px;
}

.payment-waiting {
  background: #fff3e0;
  color: #e65100;
  padding: 1rem;
  border-radius: 8px;
}

.payment-error {
  background: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
}

.tx-link {
  display: block;
  margin-top: 0.5rem;
  color: #1565c0;
  text-decoration: underline;
  font-size: 0.9rem;
}

.tx-link:hover {
  color: #0d47a1;
}
</style>
