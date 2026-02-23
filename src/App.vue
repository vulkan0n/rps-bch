<template>
  <div id="app">
    <header>
      <div class="header-brand">
        <h1>RPS<span class="accent">×</span>BCH</h1>
        <p class="subtitle">{{ $t('app.subtitle') }}</p>
      </div>
      <div class="lang-selector" v-click-outside="closeLangDropdown">
        <button class="lang-current" @click="langDropdownOpen = !langDropdownOpen">
          <img :src="currentFlag" class="lang-flag" alt="flag" />
          <span class="lang-code">{{ locale === 'en' ? 'EN' : 'ES' }}</span>
          <span class="lang-arrow">&#9662;</span>
        </button>
        <div v-if="langDropdownOpen" class="lang-dropdown">
          <button
            class="lang-option"
            :class="{ active: locale !== 'en' }"
            @click="setLocale(locale === 'en' ? 'es' : 'en')"
          >
            <img :src="otherFlag" class="lang-flag" alt="flag" />
            <span class="lang-code">{{ locale === 'en' ? 'ES' : 'EN' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main>
      <GameLobby />
    </main>

    <footer>
      <p>{{ $t('app.footer') }}</p>
    </footer>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import GameLobby from "./components/GameLobby.vue";
import flagEN from "@/assets/images/EN.png";
import flagES from "@/assets/images/ES.png";

export default {
  name: "App",
  components: {
    GameLobby,
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
    const langDropdownOpen = ref(false);

    const currentFlag = computed(() => locale.value === 'en' ? flagEN : flagES);
    const otherFlag = computed(() => locale.value === 'en' ? flagES : flagEN);

    const setLocale = (lang) => {
      locale.value = lang;
      localStorage.setItem('rps-bch-locale', lang);
      langDropdownOpen.value = false;
    };

    const closeLangDropdown = () => {
      langDropdownOpen.value = false;
    };

    return {
      locale,
      langDropdownOpen,
      currentFlag,
      otherFlag,
      setLocale,
      closeLangDropdown,
    };
  },
};
</script>

<style>
/* === CSS CUSTOM PROPERTIES — UNDERGROUND ARENA THEME === */
:root {
  --bg: #0a0a0f;
  --surface: #0f0f18;
  --surface-alt: #141420;
  --surface-hover: #191928;
  --border: #1a1a2e;
  --border-bright: #252540;
  --green: #00ff88;
  --green-dim: #00cc6e;
  --green-glow: rgba(0, 255, 136, 0.08);
  --green-glow-strong: rgba(0, 255, 136, 0.18);
  --amber: #ffaa00;
  --amber-dim: #cc8800;
  --amber-glow: rgba(255, 170, 0, 0.08);
  --amber-glow-strong: rgba(255, 170, 0, 0.18);
  --red: #ff2244;
  --red-dim: #cc1133;
  --red-glow: rgba(255, 34, 68, 0.08);
  --red-glow-strong: rgba(255, 34, 68, 0.18);
  --text: #d0d0e8;
  --text-dim: #6a6a90;
  --text-muted: #2e2e48;
  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
  --font-mono: 'Share Tech Mono', monospace;
  --radius: 2px;
  --radius-sm: 1px;
}

/* === RESET & BASE === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background-color: var(--bg);
  background-image:
    linear-gradient(rgba(0, 255, 136, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  min-height: 100vh;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* === HEADER === */
header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.25rem;
  background: rgba(10, 10, 15, 0.92);
  border-bottom: 1px solid var(--border-bright);
  backdrop-filter: blur(12px);
  z-index: 100;
}

header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green), transparent);
  opacity: 0.5;
}

.header-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  /* Only right padding needed — selector lives on the right */
  padding-right: 60px;
}

@media (min-width: 480px) {
  .header-brand {
    padding-right: 0;
  }
}

header h1 {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  letter-spacing: 0.06em;
  color: var(--text);
  line-height: 1;
}

header h1 .accent {
  color: var(--green);
  text-shadow: 0 0 16px rgba(0, 255, 136, 0.6);
}

.subtitle {
  /* Mobile: Rajdhani (compact) at tab-button size, tight spacing, one line */
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  margin-top: 2px;
}

@media (min-width: 480px) {
  .subtitle {
    /* Desktop: match the tab-button size (Rajdhani 0.9rem) */
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    white-space: normal;
    margin-top: 2px;
  }
}

/* === LANGUAGE SELECTOR === */
.lang-selector {
  position: absolute;
  top: 8px;
  right: 0.75rem;
  z-index: 10;
}

@media (min-width: 480px) {
  .lang-selector {
    top: 50%;
    right: 1.25rem;
    transform: translateY(-50%);
  }
}

.lang-current {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  background: var(--surface);
  color: var(--text-dim);
  border: 1px solid var(--border-bright);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  transition: all 0.2s;
  min-height: 28px;
}

@media (min-width: 480px) {
  .lang-current {
    gap: 5px;
    padding: 6px 10px;
    font-size: 0.75rem;
    min-height: 36px;
  }
}

.lang-current:hover {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-glow);
}

.lang-flag {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
}

@media (min-width: 480px) {
  .lang-flag {
    width: 16px;
    height: 16px;
  }
}

.lang-code {
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.lang-arrow {
  font-size: 0.6rem;
  opacity: 0.6;
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--surface-alt);
  border: 1px solid var(--border-bright);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
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
  color: var(--text-dim);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  transition: all 0.15s;
  min-height: 36px;
}

.lang-option:hover {
  background: var(--green-glow);
  color: var(--green);
}

/* === MAIN CONTENT === */
main {
  flex: 1;
  padding: 1.25rem 1rem;
  width: 100%;
  max-width: 1280px;
  align-self: center;
}

@media (min-width: 480px) {
  main {
    padding: 1.5rem;
  }
}

@media (min-width: 768px) {
  main {
    padding: 2rem;
  }
}

/* === FOOTER === */
footer {
  text-align: center;
  padding: 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
