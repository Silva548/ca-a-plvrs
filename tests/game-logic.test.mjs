import test from "node:test";
import assert from "node:assert/strict";
import {
  applyGuess,
  calculateStatistics,
  createShareText,
  getDailyChallenge,
  getDateKey,
  normalizeWord,
  scoreGuess,
  validateGuess
} from "../src/game-logic.mjs";
import { loadProgress, saveProgress, STORAGE_KEY } from "../src/persistence.mjs";
import { ACCEPTED_GUESSES, ANSWERS } from "../src/word-bank.mjs";

test("acerta na primeira e na sexta tentativa e bloqueia depois de concluir", () => {
  const challenge = { word: "cobra", category: "Animais" };
  const first = applyGuess({ guesses: [], completed: false, won: false, answer: null }, challenge, "cobra");
  assert.equal(first.game.won, true);
  assert.equal(first.game.guesses.length, 1);

  let game = { guesses: [], completed: false, won: false, answer: null };
  for (const guess of ["manga", "folha", "tenis", "atomo", "pixel"]) {
    game = applyGuess(game, challenge, guess).game;
  }
  const sixth = applyGuess(game, challenge, "cobra");
  assert.equal(sixth.game.won, true);
  assert.equal(sixth.game.guesses.length, 6);
  assert.equal(applyGuess(sixth.game, challenge, "livro").error, "finished");
});

test("encerra como derrota depois de seis tentativas válidas", () => {
  let game = { guesses: [], completed: false, won: false, answer: null };
  for (const guess of ["manga", "folha", "tenis", "atomo", "pixel", "livro"]) {
    game = applyGuess(game, { word: "cobra" }, guess).game;
  }
  assert.equal(game.completed, true);
  assert.equal(game.won, false);
  assert.equal(game.answer, "cobra");
});

test("pontua letras repetidas sem exceder as ocorrências da resposta", () => {
  assert.deepEqual(scoreGuess("carro", "arara"), ["present", "present", "absent", "correct", "absent"]);
  assert.deepEqual(scoreGuess("cacto", "cacao"), ["correct", "correct", "correct", "absent", "correct"]);
});

test("normaliza acentos e cedilha sem alterar a grafia exibida", () => {
  assert.equal(normalizeWord("AÇÃO"), "ACAO");
  assert.equal(normalizeWord("maçãs"), "MACAS");
  assert.equal(validateGuess("maçãs").valid, true);
  assert.deepEqual(scoreGuess("avião", "AVIAO"), ["correct", "correct", "correct", "correct", "correct"]);
});

test("rejeita tamanho inválido, palavra desconhecida e tentativa repetida", () => {
  assert.equal(validateGuess("gato").reason, "length");
  assert.equal(validateGuess("xyzzy").reason, "unknown");
  assert.equal(validateGuess("maçãs", ["macas"]).reason, "repeated");
});

test("tentativas inválidas não alteram a partida nem consomem oportunidades", () => {
  const game = { guesses: ["MANGA"], completed: false, won: false, answer: null };
  for (const [guess, error] of [["gato", "length"], ["xyzzy", "unknown"], ["manga", "repeated"]]) {
    const result = applyGuess(game, { word: "cobra" }, guess);
    assert.equal(result.error, error);
    assert.equal(result.game, game);
    assert.equal(result.game.guesses.length, 1);
  }
});

test("banco de respostas tem cinco letras únicas e integra o vocabulário aceito", () => {
  const normalizedAnswers = ANSWERS.map(({ word }) => normalizeWord(word));
  const normalizedAccepted = new Set(ACCEPTED_GUESSES.map(normalizeWord));
  assert.equal(new Set(normalizedAnswers).size, ANSWERS.length);
  assert.ok(normalizedAnswers.every((word) => word.length === 5));
  assert.ok(normalizedAnswers.every((word) => normalizedAccepted.has(word)));
  assert.ok(ACCEPTED_GUESSES.every((word) => normalizeWord(word).length === 5));
});

test("seleciona a mesma palavra para a mesma data, independente do instante", () => {
  assert.deepEqual(getDailyChallenge("2026-10-21"), getDailyChallenge("2026-10-21"));
  assert.notEqual(getDailyChallenge("2026-10-21").word, getDailyChallenge("2026-10-22").word);
  assert.equal(getDateKey(new Date("2026-10-21T13:00:00Z")), "2026-10-21");
  assert.throws(() => getDailyChallenge("2026-02-30"), /data do desafio não é válida/);
});

test("vira o desafio à meia-noite de São Paulo, independentemente do fuso UTC", () => {
  assert.equal(getDateKey(new Date("2026-10-28T02:59:59Z")), "2026-10-27");
  assert.equal(getDateKey(new Date("2026-10-28T03:00:00Z")), "2026-10-28");
});

test("calcula estatísticas, streak atual, melhor streak e lacuna", () => {
  const games = {
    "2026-10-18": { guesses: ["cobra"], completed: true, won: true, answer: "cobra" },
    "2026-10-19": { guesses: ["manga", "cobra"], completed: true, won: true, answer: "cobra" },
    "2026-10-21": { guesses: ["cobra"], completed: true, won: false, answer: "cobra" }
  };
  const stats = calculateStatistics(games, "2026-10-21");
  assert.equal(stats.gamesPlayed, 3);
  assert.equal(stats.wins, 2);
  assert.equal(stats.winRate, 67);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.bestStreak, 2);
  assert.equal(calculateStatistics(games, "2026-10-24").currentStreak, 0);
});

test("salva e recupera progresso sem duplicar partidas", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const progress = {
    version: 1,
    games: {
      "2026-10-21": { guesses: ["COBRA"], completed: true, won: true, answer: "cobra" }
    }
  };
  saveProgress(progress, storage);
  assert.deepEqual(loadProgress(storage), progress);
  assert.equal(values.has(STORAGE_KEY), true);
});

test("recusa dados persistidos malformados", () => {
  const storage = { getItem: () => '{"version":1,"games":{"bad":{"guesses":[]}}}' };
  assert.throws(() => loadProgress(storage), /histórico salvo contém uma partida inválida/);
  const invalidGuess = {
    getItem: () => '{"version":1,"games":{"2026-10-21":{"guesses":["!!!!!"],"completed":false,"won":false,"answer":null}}}'
  };
  assert.throws(() => loadProgress(invalidGuess), /histórico salvo contém uma tentativa inválida/);
  const invalidDate = {
    getItem: () => '{"version":1,"games":{"2026-02-30":{"guesses":[],"completed":false,"won":false,"answer":null}}}'
  };
  assert.throws(() => loadProgress(invalidDate), /histórico salvo contém uma partida inválida/);
});

test("propaga falhas de leitura e gravação do armazenamento", () => {
  const readFailure = { getItem: () => { throw new Error("leitura bloqueada"); } };
  const writeFailure = { setItem: () => { throw new Error("quota excedida"); } };
  assert.throws(() => loadProgress(readFailure), /leitura bloqueada/);
  assert.throws(() => saveProgress({ version: 1, games: {} }, writeFailure), /quota excedida/);
});

test("o resultado compartilhável usa apenas grade, tentativas e estado, nunca a solução", () => {
  const secret = "cobra";
  const guesses = ["manga", "cobra"];
  const shareText = createShareText({
    guesses,
    completed: true,
    won: true,
    answer: secret
  }, secret);
  assert.match(shareText, /vitória em 2\/6/);
  assert.equal(shareText.includes(secret), false);
});
