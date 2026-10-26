import { ACCEPTED_GUESSES, ANSWERS } from "./word-bank.mjs";

export const MAX_ATTEMPTS = 6;
export const WORD_LENGTH = 5;
export const GAME_TIME_ZONE = "America/Sao_Paulo";
export const GAME_EPOCH = "2026-01-01";

const acceptedWords = new Set(ACCEPTED_GUESSES.map(normalizeWord));

export function normalizeWord(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/[^A-Z]/g, "");
}

export function getDateKey(date = new Date(), timeZone = GAME_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getDailyChallenge(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new TypeError("A data do desafio deve estar no formato AAAA-MM-DD.");
  }
  const current = Date.parse(`${dateKey}T00:00:00Z`);
  const epoch = Date.parse(`${GAME_EPOCH}T00:00:00Z`);
  if (!Number.isFinite(current) || new Date(current).toISOString().slice(0, 10) !== dateKey) {
    throw new TypeError("A data do desafio não é válida.");
  }
  const dayNumber = Math.floor((current - epoch) / 86_400_000);
  const index = ((dayNumber % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;
  return { ...ANSWERS[index], date: dateKey };
}

export function validateGuess(guess, previousGuesses = []) {
  const normalized = normalizeWord(guess);
  if (normalized.length !== WORD_LENGTH) {
    return { valid: false, reason: "length" };
  }
  if (!acceptedWords.has(normalized)) {
    return { valid: false, reason: "unknown" };
  }
  if (previousGuesses.some((previous) => normalizeWord(previous) === normalized)) {
    return { valid: false, reason: "repeated" };
  }
  return { valid: true, normalized };
}

export function scoreGuess(secret, guess) {
  const answer = normalizeWord(secret);
  const attempt = normalizeWord(guess);
  if (answer.length !== WORD_LENGTH || attempt.length !== WORD_LENGTH) {
    throw new TypeError(`A resposta e a tentativa devem ter ${WORD_LENGTH} letras.`);
  }

  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = new Map();
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (attempt[index] === answer[index]) {
      result[index] = "correct";
    } else {
      remaining.set(answer[index], (remaining.get(answer[index]) || 0) + 1);
    }
  }
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] === "correct") continue;
    const count = remaining.get(attempt[index]) || 0;
    if (count > 0) {
      result[index] = "present";
      remaining.set(attempt[index], count - 1);
    }
  }
  return result;
}

export function calculateStatistics(games, today) {
  const completed = Object.entries(games)
    .filter(([, game]) => game.completed)
    .map(([date, game]) => ({ date, game }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const wins = completed.filter(({ game }) => game.won).length;

  let bestStreak = 0;
  let streak = 0;
  let previousDay = null;
  for (const { date } of completed) {
    const day = Date.parse(`${date}T00:00:00Z`);
    streak = previousDay !== null && day - previousDay === 86_400_000 ? streak + 1 : 1;
    bestStreak = Math.max(bestStreak, streak);
    previousDay = day;
  }

  let currentStreak = 0;
  const latestDate = completed.at(-1)?.date;
  if (latestDate) {
    const daysSinceLatest = Math.floor(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestDate}T00:00:00Z`)) / 86_400_000
    );
    if (daysSinceLatest <= 1) {
      currentStreak = 1;
      let cursor = Date.parse(`${latestDate}T00:00:00Z`);
      for (let index = completed.length - 2; index >= 0; index -= 1) {
        const previous = Date.parse(`${completed[index].date}T00:00:00Z`);
        if (cursor - previous !== 86_400_000) break;
        currentStreak += 1;
        cursor = previous;
      }
    }
  }

  return {
    gamesPlayed: completed.length,
    wins,
    winRate: completed.length ? Math.round((wins / completed.length) * 100) : 0,
    currentStreak,
    bestStreak,
    history: completed.slice().reverse().slice(0, 30).map(({ date, game }) => ({
      date,
      won: game.won,
      attempts: game.guesses.length,
      answer: game.answer
    }))
  };
}

export function createEmptyGame() {
  return { guesses: [], completed: false, won: false, answer: null };
}

export function applyGuess(game, challenge, guess) {
  if (game.completed) {
    return { game, feedback: null, error: "finished" };
  }
  const validation = validateGuess(guess, game.guesses);
  if (!validation.valid) {
    return { game, feedback: null, error: validation.reason };
  }

  const guesses = [...game.guesses, validation.normalized];
  const won = validation.normalized === normalizeWord(challenge.word);
  const completed = won || guesses.length === MAX_ATTEMPTS;
  const feedback = scoreGuess(challenge.word, validation.normalized);
  return {
    game: {
      guesses,
      completed,
      won,
      answer: completed ? challenge.word : null
    },
    feedback,
    error: null
  };
}

export function createShareText(game, secret) {
  if (!game.completed) {
    throw new Error("O resultado só pode ser compartilhado após o fim da partida.");
  }
  const grid = game.guesses.map((guess) => scoreGuess(secret, guess)
    .map((state) => ({ correct: "🟩", present: "🟨", absent: "⬛" })[state])
    .join("")).join("\n");
  const outcome = game.won ? "vitória" : "derrota";
  return `Jogo de Palavras — Desafio diário\nResultado: ${outcome} em ${game.guesses.length}/6 tentativas\n${grid}`;
}
