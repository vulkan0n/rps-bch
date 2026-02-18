import Gun from "gun";

class GunManager {
  constructor() {
    const RENDER_RELAY_URL = "https://gundb-relay.onrender.com/gun";
    this.gun = Gun([RENDER_RELAY_URL]);
    this.lobby = this.gun.get("rps-bch-lobby");
    this.matches = this.gun.get("rps-bch-matches");
    this.users = this.gun.get("rps-bch-users");
  }

  // Guardar nickname de usuario (con firma opcional)
  async saveNickname(address, nickname, signature) {
    const data = { nickname, updatedAt: Date.now() };
    if (signature) data.signature = signature;
    await this.users.get(address).put(data);
  }

  // Verificar si un nickname ya está tomado por otro usuario (con firma)
  isNicknameTaken(nickname, excludeAddress, timeout = 3000) {
    const target = nickname.toLowerCase();
    return new Promise((resolve) => {
      let found = false;
      const collected = new Set();

      const timer = setTimeout(() => {
        resolve(found);
      }, timeout);

      this.users.map().once((data, key) => {
        if (!data || !data.nickname || !data.signature) return;
        if (key === excludeAddress) return;
        if (collected.has(key)) return;
        collected.add(key);
        if (data.nickname.toLowerCase() === target) {
          found = true;
          clearTimeout(timer);
          resolve(true);
        }
      });
    });
  }

  // Obtener nickname de usuario (espera respuesta del relay con timeout)
  getNickname(address, timeout = 3000) {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ nickname: null, signature: null });
        }
      }, timeout);

      this.users.get(address).once((data) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ nickname: data?.nickname || null, signature: data?.signature || null });
        }
      });
    });
  }

  // Publicar en el lobby
  async publishToLobby(playerData) {
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(playerId);

    await this.lobby.get(playerId).put({
      address: playerData.address,
      nickname: playerData.nickname || playerData.address.slice(-10),
      amount: playerData.amount,
      timestamp: Date.now(),
      status: "waiting",
    });

    return playerId;
  }

  // Escuchar cambios en el lobby (ignora apuestas mayores a 24h)
  watchLobby(callback) {
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

    this.lobby.map().on((data, key) => {
      if (!data) return;

      if (data.status === "waiting") {
        const age = Date.now() - (data.timestamp || 0);
        if (age < MAX_AGE_MS) {
          callback({ ...data, id: key });
        } else {
          // Marcar como expirada si tiene más de 24h
          this.lobby.get(key).put({ status: "expired" });
          // Notificar para eliminar de la lista
          callback({ ...data, id: key, status: "expired" });
        }
      } else {
        // Notificar cambios de estado (matched, expired, etc.)
        callback({ ...data, id: key });
      }
    });
  }

  // Cancelar una entrada del lobby
  async cancelLobbyEntry(entryId) {
    await this.lobby.get(entryId).put({ status: "cancelled" });
  }

  // Crear una partida
  async createMatch(playerA, playerB, amount) {
    const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(matchId);

    const matchData = {
      id: matchId,
      playerA: playerA.address,
      playerB: playerB.address,
      amount: amount,
      status: "created",
      createdAt: Date.now(),
    };

    await this.matches.get(matchId).put(matchData);

    // Actualizar estado de jugadores en lobby
    await this.lobby.get(playerA.id).put({ status: "matched", matchId });
    await this.lobby.get(playerB.id).put({ status: "matched", matchId });

    return matchId;
  }

  // Enviar commit
  async sendCommit(matchId, player, commit) {
    const commitData = {};
    commitData[`commit${player}Hash`] = commit;
    commitData[`commit${player}Time`] = Date.now();
    await this.matches.get(matchId).put(commitData);
  }

  // Enviar reveal
  async sendReveal(matchId, player, move, secret) {
    const revealData = {};
    revealData[`reveal${player}Move`] = move;
    revealData[`reveal${player}Secret`] = secret;
    revealData[`reveal${player}Time`] = Date.now();
    await this.matches.get(matchId).put(revealData);
  }

  // Observar partida
  watchMatch(matchId, callback) {
    this.matches.get(matchId).on((data, key) => {
      console.log(key);
      callback(data);
    });
  }
}

export default new GunManager();
