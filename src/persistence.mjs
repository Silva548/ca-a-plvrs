export const STORAGE_KEY = "palavra-do-dia:progress:v1";

export function validateProgress(value) {
  if (!value || value.version !== 1 || !value.games || typeof value.games !== "object" || Array.isArray(value.games)) {
    throw new Error("Os dados salvos do jogo estão em um formato inválido.");
  }
  for (const [date, game] of Object.entries(value.games)) {
    const dateTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? Date.parse(`${date}T00:00:00Z`)
      : NaN;
    if (!Number.isFinite(dateTimestamp) || new Date(dateTimestamp).toISOString().slice(0, 10) !== date
      || !game || !Array.isArray(game.guesses)
      || game.guesses.length > 6 || typeof game.completed !== "boolean"
      || typeof game.won !== "boolean") {
      throw new Error("O histórico salvo contém uma partida inválida.");
    }
    if (game.guesses.some((guess) => typeof guess !== "string" || !/^[A-Z]{5}$/.test(guess))) {
      throw new Error("O histórico salvo contém uma tentativa inválida.");
    }
    if (game.completed && typeof game.answer !== "string") {
      throw new Error("Uma partida concluída não contém a resposta.");
    }
    if (!game.completed && game.answer !== null) {
      throw new Error("Uma partida em andamento contém uma resposta revelada.");
    }
  }
  return value;
}

export function loadProgress(storage = globalThis.localStorage) {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved === null) return { version: 1, games: {} };
  return validateProgress(JSON.parse(saved));
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  validateProgress(progress);
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
