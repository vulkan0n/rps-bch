export interface Player {
  id: string;
  address: string;
  balance?: number;
}

export interface LobbyEntry {
  id: string;
  address: string;
  amount: number;
  timestamp: number;
  status: "waiting" | "matched";
  matchId?: string;
}

export interface Match {
  id: string;
  playerA: string;
  playerB: string;
  amount: number;
  status: "created" | "committed" | "revealed" | "settled";
  createdAt: number;
  commitA?: string;
  commitB?: string;
  revealA?: Reveal;
  revealB?: Reveal;
}

export interface Reveal {
  move: number;
  secret: string;
  timestamp: number;
}

export enum Move {
  ROCK = 0,
  PAPER = 1,
  SCISSORS = 2,
}

export type GameResult = "playerA" | "playerB" | "draw";
