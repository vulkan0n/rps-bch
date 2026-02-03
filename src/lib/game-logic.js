import CryptoJS from 'crypto-js';

export const MOVES = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2
};

export const MOVE_NAMES = ['rock', 'paper', 'scissors'];

export function generateSecret() {
  return CryptoJS.lib.WordArray.random(32).toString();
}

export function createCommit(move, secret) {
  const data = `${move}:${secret}`;
  return CryptoJS.SHA256(data).toString();
}

export function verifyReveal(move, secret, commit) {
  const calculatedCommit = createCommit(move, secret);
  return calculatedCommit === commit;
}

export function determineWinner(moveA, moveB) {
  if (moveA === moveB) return 'draw';

  const wins = {
    [MOVES.ROCK]: MOVES.SCISSORS,
    [MOVES.PAPER]: MOVES.ROCK,
    [MOVES.SCISSORS]: MOVES.PAPER
  };

  return wins[moveA] === moveB ? 'playerA' : 'playerB';
}

export function generateMatchId() {
  return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
