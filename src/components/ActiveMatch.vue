<template>
  <div class="active-match" :class="resultClass">
    <div class="match-header">
      <span class="opponent-name">vs {{ opponentNickname }}</span>
      <span class="bet-amount">{{ betAmount }} BCH</span>
    </div>

    <div class="match-body">
      <!-- Connecting -->
      <div v-if="phase === 'connecting'" class="phase-connecting">
        <div class="spinner-small"></div>
        <span>{{ $t('match.connecting') }}</span>
      </div>

      <!-- Selecting moves -->
      <div v-else-if="phase === 'selecting'" class="phase-selecting">
        <div class="move-buttons">
          <button
            v-for="(move, index) in moveIcons"
            :key="index"
            class="move-btn"
            @click="selectAndCommit(index)"
          >{{ move }}</button>
        </div>
        <div v-if="opponentHasCommitted" class="opponent-status">
          {{ $t('match.opponentChosen') }}
        </div>
      </div>

      <!-- Waiting for opponent commit -->
      <div v-else-if="phase === 'waiting'" class="phase-waiting">
        <div class="spinner-small"></div>
        <span>{{ $t('match.waitingOpponent') }}</span>
      </div>

      <!-- Resolving (auto-reveal in progress) -->
      <div v-else-if="phase === 'resolving'" class="phase-resolving">
        <div class="spinner-small"></div>
        <span>{{ $t('match.resolving') }}</span>
      </div>

      <!-- Result -->
      <div v-else-if="phase === 'result'" class="phase-result">
        <div class="result-moves">
          <span class="result-move">{{ moveIcons[playerMove] }}</span>
          <span class="result-vs">vs</span>
          <span class="result-move">{{ moveIcons[opponentMove] }}</span>
        </div>
        <div class="result-text">{{ resultMessage }}</div>
        <div v-if="paymentStatus" class="payment-info">
          <template v-if="paymentStatus === 'processing'">
            <div class="spinner-small"></div>
            <span>{{ $t('match.sendingPayment') }}</span>
          </template>
          <template v-else-if="paymentStatus === 'completed'">
            <a :href="explorerUrl" target="_blank" class="tx-link">{{ $t('match.paymentSent') }}</a>
          </template>
          <template v-else-if="paymentStatus === 'waiting_payment'">
            {{ $t('match.waitingPayment') }}
          </template>
          <template v-else-if="paymentStatus === 'received'">
            <a :href="explorerUrl" target="_blank" class="tx-link">{{ $t('match.paymentReceived') }}</a>
          </template>
          <template v-else-if="paymentStatus === 'error'">
            {{ paymentErrorMsg }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import gunManager from "../lib/gun-manager";
import walletService from "../lib/wallet-service";
import {
  generateSecret,
  createCommit,
  determineWinner,
  verifyReveal,
} from "../lib/game-logic";

export default {
  name: "ActiveMatch",
  props: {
    matchId: { type: String, required: true },
    playerAddress: { type: String, required: true },
    nickname: { type: String, required: true },
    opponentNickname: { type: String, required: true },
    betAmount: { type: Number, required: true },
    isTestnet: { type: Boolean, default: false },
  },
  emits: ["match-finished", "payment-complete"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const moveIcons = ["🪨", "📄", "✂️"];

    const phase = ref("connecting");
    const playerRole = ref(null);
    const playerMove = ref(null);
    const playerSecret = ref("");
    const opponentMove = ref(null);
    const opponentCommit = ref(null);
    const opponentHasCommitted = ref(false);
    const resultMessage = ref("");
    const paymentStatus = ref("");
    const paymentErrorMsg = ref("");
    const matchData = ref(null);
    const paymentTxId = ref("");
    const hasAutoRevealed = ref(false);
    let autoRemoveTimer = null;

    const explorerUrl = computed(() => {
      if (!paymentTxId.value) return "";
      const base = props.isTestnet
        ? "https://blockchair.com/bitcoin-cash/testnet/transaction/"
        : "https://blockchair.com/bitcoin-cash/transaction/";
      return base + paymentTxId.value;
    });

    const resultClass = computed(() => {
      if (phase.value !== "result") return "";
      if (resultMessage.value === t("match.youWin")) return "result-win";
      if (resultMessage.value === t("match.youLose")) return "result-lose";
      if (resultMessage.value === t("match.draw")) return "result-draw";
      if (resultMessage.value === t("match.opponentCheated")) return "result-win";
      return "";
    });

    const selectAndCommit = async (moveIndex) => {
      if (phase.value !== "selecting") return;
      playerMove.value = moveIndex;
      playerSecret.value = generateSecret();
      const commit = createCommit(moveIndex, playerSecret.value);

      await gunManager.sendCommit(props.matchId, playerRole.value, commit);

      if (opponentHasCommitted.value) {
        phase.value = "resolving";
        autoReveal();
      } else {
        phase.value = "waiting";
      }
    };

    const autoReveal = async () => {
      if (hasAutoRevealed.value) return;
      hasAutoRevealed.value = true;
      await gunManager.sendReveal(
        props.matchId,
        playerRole.value,
        playerMove.value,
        playerSecret.value
      );
    };

    const calculateResult = async (myMove, theirMove) => {
      const moveA = playerRole.value === "A" ? myMove : theirMove;
      const moveB = playerRole.value === "A" ? theirMove : myMove;
      const winner = determineWinner(moveA, moveB);

      let result;
      if (winner === "draw") {
        resultMessage.value = t("match.draw");
        result = "draw";
      } else if (
        (playerRole.value === "A" && winner === "playerA") ||
        (playerRole.value === "B" && winner === "playerB")
      ) {
        resultMessage.value = t("match.youWin");
        result = "win";
        paymentStatus.value = "waiting_payment";
      } else {
        resultMessage.value = t("match.youLose");
        result = "loss";
        await processPayment();
      }

      // Record result in leaderboard
      const nick =
        localStorage.getItem(`rps-bch-nickname-${props.playerAddress}`) ||
        props.playerAddress.slice(-10);
      gunManager.recordResult(props.playerAddress, nick, result);

      phase.value = "result";

      // Auto-remove after 10s
      autoRemoveTimer = setTimeout(() => {
        emit("match-finished", props.matchId);
      }, 10000);
    };

    const processPayment = async () => {
      if (!matchData.value || !matchData.value.amount) return;

      const amount = parseFloat(matchData.value.amount);
      const winnerAddress =
        playerRole.value === "A"
          ? matchData.value.playerB
          : matchData.value.playerA;

      paymentStatus.value = "processing";

      try {
        const result = await walletService.send(winnerAddress, amount);
        paymentStatus.value = "completed";
        paymentTxId.value = result.txid;

        await gunManager.matches.get(props.matchId).put({
          paymentTxId: result.txid,
          paymentFrom: playerRole.value,
          paymentTime: Date.now(),
        });

        emit("payment-complete");
      } catch (error) {
        paymentStatus.value = "error";
        paymentErrorMsg.value = t("match.paymentError", {
          message: error.message,
        });
      }
    };

    onMounted(() => {
      gunManager.watchMatch(props.matchId, (data) => {
        // Store match data for payment
        if (data.amount && data.playerA && data.playerB) {
          matchData.value = {
            amount: data.amount,
            playerA: data.playerA,
            playerB: data.playerB,
          };
        }

        // Detect player role (once)
        if (data.playerA && data.playerB && !playerRole.value) {
          playerRole.value =
            data.playerB === props.playerAddress ? "B" : "A";
          if (phase.value === "connecting") {
            phase.value = "selecting";
          }
        }

        // Detect payment received
        if (data.paymentTxId && paymentStatus.value === "waiting_payment") {
          paymentStatus.value = "received";
          paymentTxId.value = data.paymentTxId;
          emit("payment-complete");
        }

        if (!playerRole.value) return;

        const opponentCommitKey =
          playerRole.value === "A" ? "commitBHash" : "commitAHash";
        const playerCommitKey =
          playerRole.value === "A" ? "commitAHash" : "commitBHash";
        const opponentRevealMoveKey =
          playerRole.value === "A" ? "revealBMove" : "revealAMove";
        const opponentRevealSecretKey =
          playerRole.value === "A" ? "revealBSecret" : "revealASecret";
        const playerRevealMoveKey =
          playerRole.value === "A" ? "revealAMove" : "revealBMove";

        const opponentCommitted = !!data[opponentCommitKey];
        const playerCommitted = !!data[playerCommitKey];

        if (opponentCommitted) {
          opponentCommit.value = data[opponentCommitKey];
          opponentHasCommitted.value = true;
        }

        // Both committed → auto-reveal
        if (
          playerCommitted &&
          opponentCommitted &&
          phase.value === "waiting"
        ) {
          phase.value = "resolving";
          autoReveal();
        }

        // Detect reveals and calculate result
        const opponentRevealed = data[opponentRevealMoveKey] != null;
        const playerRevealed = data[playerRevealMoveKey] != null;

        if (
          opponentRevealed &&
          playerRevealed &&
          phase.value !== "result"
        ) {
          const theirMove = Number(data[opponentRevealMoveKey]);
          const theirSecret = data[opponentRevealSecretKey];

          if (verifyReveal(theirMove, theirSecret, opponentCommit.value)) {
            opponentMove.value = theirMove;
            calculateResult(playerMove.value, opponentMove.value);
          } else {
            resultMessage.value = t("match.opponentCheated");
            phase.value = "result";
            autoRemoveTimer = setTimeout(() => {
              emit("match-finished", props.matchId);
            }, 10000);
          }
        }
      });
    });

    onUnmounted(() => {
      gunManager.matches.get(props.matchId).off();
      if (autoRemoveTimer) clearTimeout(autoRemoveTimer);
    });

    return {
      moveIcons,
      phase,
      playerMove,
      opponentMove,
      opponentHasCommitted,
      resultMessage,
      paymentStatus,
      paymentErrorMsg,
      resultClass,
      explorerUrl,
      selectAndCommit,
    };
  },
};
</script>

<style scoped>
.active-match {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
  border-left: 4px solid #e0e0e0;
  color: #1a1a1a;
}

.active-match.result-win {
  border-left-color: #4caf50;
}

.active-match.result-lose {
  border-left-color: #ef5350;
}

.active-match.result-draw {
  border-left-color: #ff9800;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.opponent-name {
  font-weight: 600;
  color: #1a1a1a;
}

.bet-amount {
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.match-body {
  min-height: 40px;
}

.phase-connecting,
.phase-waiting,
.phase-resolving {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 0.9rem;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid #e0e0e0;
  border-top-color: #764ba2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.move-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}

.move-btn {
  font-size: 1.8rem;
  padding: 8px 14px;
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.move-btn:hover {
  border-color: #764ba2;
  background: #f3e5f5;
  transform: scale(1.1);
}

.opponent-status {
  font-size: 0.85rem;
  color: #4caf50;
  font-style: italic;
}

.phase-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-moves {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-move {
  font-size: 1.6rem;
}

.result-vs {
  font-size: 0.85rem;
  font-weight: 600;
  color: #999;
}

.result-text {
  font-weight: 700;
  font-size: 1rem;
}

.payment-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #666;
}

.tx-link {
  color: #1565c0;
  text-decoration: underline;
}

.tx-link:hover {
  color: #0d47a1;
}
</style>
