import Gun from "gun";

class GunManager {
  constructor() {
    const RENDER_RELAY_URL = "https://gundb-relay.onrender.com/gun";
    this.gun = Gun([RENDER_RELAY_URL]);
    this.lobby = this.gun.get("rps-bch-lobby");
    this.matches = this.gun.get("rps-bch-matches");
  }

  // Publicar en el lobby
  async publishToLobby(playerData) {
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(playerId);

    await this.lobby.get(playerId).put({
      address: playerData.address,
      amount: playerData.amount,
      timestamp: Date.now(),
      status: "waiting",
    });

    return playerId;
  }

  // Escuchar cambios en el lobby
  watchLobby(callback) {
    this.lobby.map().on((data, key) => {
      if (data && data.status === "waiting") {
        callback({ ...data, id: key });
      }
    });
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
    await this.matches.get(matchId).get(`commit${player}`).put({
      hash: commit,
      timestamp: Date.now(),
    });
  }

  // Enviar reveal
  async sendReveal(matchId, player, move, secret) {
    await this.matches.get(matchId).get(`reveal${player}`).put({
      move: move,
      secret: secret,
      timestamp: Date.now(),
    });
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
