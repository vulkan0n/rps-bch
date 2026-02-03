<template>
  <div id="app">
    <header>
      <h1>Piedra, Papel o Tijera</h1>
      <p class="subtitle">Juega y apuesta con Bitcoin Cash</p>
    </header>

    <main>
      <GameLobby v-if="!currentMatch" @match-created="handleMatchCreated" />
      <GameRoom v-else :match-id="currentMatch" @match-ended="handleMatchEnded" />
    </main>

    <footer>
      <p>Powered by Bitcoin Cash | P2P with GunDB | CashScript Smart Contracts</p>
    </footer>
  </div>
</template>

<script>
import { ref } from "vue";
import GameLobby from "./components/GameLobby.vue";
import GameRoom from "./components/GameRoom.vue";

export default {
  name: "App",
  components: {
    GameLobby,
    GameRoom,
  },
  setup() {
    const currentMatch = ref(null);

    const handleMatchCreated = (matchId) => {
      currentMatch.value = matchId;
    };

    const handleMatchEnded = () => {
      currentMatch.value = null;
    };

    return {
      currentMatch,
      handleMatchCreated,
      handleMatchEnded,
    };
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

main {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

footer {
  text-align: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  color: white;
  font-size: 0.9rem;
}
</style>
