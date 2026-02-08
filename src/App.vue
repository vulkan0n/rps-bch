<template>
  <div id="app">
    <header>
      <div class="lang-selector" v-click-outside="closeLangDropdown">
        <button class="lang-current" @click="langDropdownOpen = !langDropdownOpen">
          <span class="lang-flag">{{ locale === 'en' ? '🇺🇸' : '🇪🇸' }}</span>
          <span class="lang-code">{{ locale === 'en' ? 'EN' : 'ES' }}</span>
          <span class="lang-arrow">&#9662;</span>
        </button>
        <div v-if="langDropdownOpen" class="lang-dropdown">
          <button
            class="lang-option"
            :class="{ active: locale !== 'en' }"
            @click="setLocale(locale === 'en' ? 'es' : 'en')"
          >
            <span class="lang-flag">{{ locale === 'en' ? '🇪🇸' : '🇺🇸' }}</span>
            <span class="lang-code">{{ locale === 'en' ? 'ES' : 'EN' }}</span>
          </button>
        </div>
      </div>
      <h1>{{ $t('app.title') }}</h1>
      <p class="subtitle">{{ $t('app.subtitle') }}</p>
    </header>

    <main>
      <GameLobby v-if="!currentMatch" @match-created="handleMatchCreated" />
      <GameRoom v-else :match-id="currentMatch" @match-ended="handleMatchEnded" />
    </main>

    <footer>
      <p>{{ $t('app.footer') }}</p>
    </footer>
  </div>
</template>

<script>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import GameLobby from "./components/GameLobby.vue";
import GameRoom from "./components/GameRoom.vue";

export default {
  name: "App",
  components: {
    GameLobby,
    GameRoom,
  },
  directives: {
    'click-outside': {
      mounted(el, binding) {
        el._clickOutside = (e) => {
          if (!el.contains(e.target)) binding.value();
        };
        document.addEventListener('click', el._clickOutside);
      },
      unmounted(el) {
        document.removeEventListener('click', el._clickOutside);
      },
    },
  },
  setup() {
    const { locale } = useI18n();
    const currentMatch = ref(null);
    const langDropdownOpen = ref(false);

    const setLocale = (lang) => {
      locale.value = lang;
      localStorage.setItem('rps-bch-locale', lang);
      langDropdownOpen.value = false;
    };

    const closeLangDropdown = () => {
      langDropdownOpen.value = false;
    };

    const handleMatchCreated = (matchId) => {
      currentMatch.value = matchId;
    };

    const handleMatchEnded = () => {
      currentMatch.value = null;
    };

    return {
      locale,
      currentMatch,
      langDropdownOpen,
      setLocale,
      closeLangDropdown,
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
  position: relative;
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

.lang-selector {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.lang-current {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: background 0.2s;
}

.lang-current:hover {
  background: rgba(255, 255, 255, 0.35);
}

.lang-flag {
  font-size: 1.1rem;
  line-height: 1;
}

.lang-code {
  font-size: 0.85rem;
}

.lang-arrow {
  font-size: 0.7rem;
  opacity: 0.8;
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  min-width: 100%;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: #333;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: background 0.15s;
}

.lang-option:hover {
  background: rgba(102, 126, 234, 0.15);
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
