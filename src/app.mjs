import {
  applyGuess,
  calculateStatistics,
  createShareText,
  createEmptyGame,
  getDailyChallenge,
  getDateKey,
  MAX_ATTEMPTS,
  normalizeWord,
  scoreGuess,
  WORD_LENGTH
} from "./game-logic.mjs";
import { loadProgress, saveProgress } from "./persistence.mjs";

const $ = (selector) => document.querySelector(selector);
const board = $("#board");
const keyboard = $("#keyboard");
const status = $("#live-message");
const toast = $("#toast");
const dateKey = getDateKey();
const challenge = getDailyChallenge(dateKey);
let progress;
let persistenceAvailable = true;
let currentGuess = "";
let toastTimer;
let theme = "light";

try {
  progress = loadProgress();
} catch (error) {
  progress = { version: 1, games: {} };
  persistenceAvailable = false;
  showMessage(`Não foi possível ler seu progresso salvo: ${error.message} O jogo continuará apenas nesta sessão.`);
}

let game = progress.games[dateKey] || createEmptyGame();
try {
  const savedTheme = localStorage.getItem("palavra-do-dia:theme");
  if (savedTheme === "dark") theme = "dark";
} catch {
  showMessage("A preferência de tema não pôde ser carregada; usando o tema claro.");
}
document.documentElement.dataset.theme = theme;

function showMessage(message, timeout = 4000) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  if (timeout > 0) {
    toastTimer = setTimeout(() => { toast.hidden = true; }, timeout);
  }
}

function persistGame() {
  progress.games[dateKey] = game;
  if (!persistenceAvailable) return;
  try {
    saveProgress(progress);
  } catch (error) {
    persistenceAvailable = false;
    showMessage(`Não foi possível salvar seu progresso: ${error.message} As próximas alterações ficarão apenas nesta sessão.`, 0);
  }
}

function currentStatistics() {
  return calculateStatistics(progress.games, dateKey);
}

function renderBoard() {
  board.replaceChildren();
  for (let rowIndex = 0; rowIndex < MAX_ATTEMPTS; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "board-row";
    row.setAttribute("role", "group");
    const guess = game.guesses[rowIndex] || (rowIndex === game.guesses.length && !game.completed ? currentGuess : "");
    const feedback = rowIndex < game.guesses.length ? scoreForSavedGuess(game.guesses[rowIndex]) : [];
    row.setAttribute("aria-label", guess
      ? rowIndex < game.guesses.length
        ? describeGuess(guess, feedback, rowIndex)
        : `Tentativa ${rowIndex + 1}: ${guess.length} de ${WORD_LENGTH} letras digitadas: ${[...guess].join(", ")}`
      : `Tentativa ${rowIndex + 1} vazia`);
    for (let column = 0; column < WORD_LENGTH; column += 1) {
      const tile = document.createElement("span");
      tile.className = "tile";
      tile.setAttribute("aria-hidden", "true");
      tile.textContent = guess[column] || "";
      if (feedback[column]) tile.dataset.state = feedback[column];
      else if (guess[column]) tile.dataset.state = "filled";
      row.append(tile);
    }
    board.append(row);
  }
  const used = game.guesses.length;
  $("#attempt-count").textContent = game.completed
    ? `${used} ${used === 1 ? "tentativa usada" : "tentativas usadas"}`
    : `${MAX_ATTEMPTS - used} ${MAX_ATTEMPTS - used === 1 ? "tentativa restante" : "tentativas restantes"}`;
  $("#category").textContent = challenge.category;
  $("#category-inline").textContent = challenge.category.toLocaleLowerCase("pt-BR");
  $("#word-length").textContent = `${WORD_LENGTH} letras`;
  $("#board-description").textContent = game.guesses.length
    ? game.guesses.map((word, index) => describeGuess(word, scoreForSavedGuess(word), index)).join(". ")
    : "Nenhuma tentativa enviada.";
  $("#submit-guess").disabled = game.completed;
  renderKeyboard();
}

function scoreForSavedGuess(guess) {
  return scoreGuess(challenge.word, guess);
}

function describeGuess(guess, feedback, index) {
  const result = feedback.map((state, position) => {
    const letter = guess[position];
    if (state === "correct") return `${letter} na posição correta`;
    if (state === "present") return `${letter} presente em outra posição`;
    return `${letter} não aparece`;
  });
  return `Tentativa ${index + 1}: ${result.join(", ")}`;
}

function renderKeyboard() {
  const letterStates = new Map();
  const priority = { absent: 1, present: 2, correct: 3 };
  game.guesses.forEach((guess) => {
    const feedback = scoreForSavedGuess(guess);
    [...guess].forEach((letter, index) => {
      const state = feedback[index];
      if (!letterStates.has(letter) || priority[state] > priority[letterStates.get(letter)]) {
        letterStates.set(letter, state);
      }
    });
  });
  keyboard.querySelectorAll("button[data-key]").forEach((button) => {
    const key = button.dataset.key;
    button.dataset.state = letterStates.get(key) || "";
    button.disabled = game.completed;
  });
}

function renderResult() {
  const resultPanel = $("#result-panel");
  if (!game.completed) {
    resultPanel.hidden = true;
    return;
  }
  resultPanel.hidden = false;
  $("#result-title").textContent = game.won ? "Mandou bem!" : "Quase lá!";
  $("#result-description").textContent = game.won
    ? `Você descobriu em ${game.guesses.length} ${game.guesses.length === 1 ? "tentativa" : "tentativas"}.`
    : "As tentativas acabaram. Amanhã tem mais!";
  $("#answer-reveal").textContent = challenge.word.toLocaleUpperCase("pt-BR");
  $("#answer-category").textContent = `A palavra de hoje era ${challenge.category.toLocaleLowerCase("pt-BR")}.`;
  const stats = currentStatistics();
  $("#result-streak").textContent = `${stats.currentStreak} ${stats.currentStreak === 1 ? "dia" : "dias"}`;
  $("#result-win-rate").textContent = `${stats.winRate}%`;
}

function renderStatsDialog() {
  const stats = currentStatistics();
  $("#stat-played").textContent = String(stats.gamesPlayed);
  $("#stat-wins").textContent = String(stats.wins);
  $("#stat-rate").textContent = `${stats.winRate}%`;
  $("#stat-streak").textContent = String(stats.currentStreak);
  $("#stat-best-streak").textContent = String(stats.bestStreak);
  const history = $("#history-list");
  history.replaceChildren();
  if (!stats.history.length) {
    const empty = document.createElement("li");
    empty.textContent = "Suas partidas concluídas vão aparecer aqui.";
    history.append(empty);
    return;
  }
  stats.history.forEach((entry) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = formatDate(entry.date);
    const detail = document.createElement("span");
    detail.textContent = `${entry.won ? "Vitória" : "Não resolvida"} · ${entry.attempts}/6 tentativas`;
    item.append(title, detail);
    history.append(item);
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function render() {
  renderBoard();
  renderResult();
}

function submitGuess() {
  if (game.completed) return;
  const result = applyGuess(game, challenge, currentGuess);
  if (result.error) {
    const messages = {
      length: `Digite uma palavra com ${WORD_LENGTH} letras.`,
      unknown: "Essa palavra não está no nosso vocabulário. Tente outra.",
      repeated: "Você já tentou essa palavra."
    };
    showMessage(messages[result.error] || "Não foi possível enviar a palavra.");
    status.textContent = messages[result.error] || "Não foi possível enviar a palavra.";
    return;
  }
  game = result.game;
  currentGuess = "";
  persistGame();
  render();
  const latest = game.guesses.at(-1);
  const announcement = describeGuess(latest, result.feedback, game.guesses.length - 1);
  status.textContent = game.completed
    ? `${announcement}. ${game.won ? "Você venceu!" : `A resposta era ${challenge.word}.`}`
    : announcement;
  if (game.completed) showMessage(game.won ? "Desafio concluído. Parabéns!" : "Fim de jogo. A resposta foi revelada.");
}

function enterLetter(letter) {
  if (game.completed) return;
  const normalized = normalizeWord(letter);
  if (normalized.length !== 1) return;
  if (currentGuess.length >= WORD_LENGTH) return;
  currentGuess += normalized;
  status.textContent = `Palpite atual: ${[...currentGuess].join(", ")}. ${currentGuess.length} de ${WORD_LENGTH} letras.`;
  renderBoard();
}

function removeLetter() {
  if (game.completed || !currentGuess) return;
  currentGuess = currentGuess.slice(0, -1);
  status.textContent = currentGuess
    ? `Palpite atual: ${[...currentGuess].join(", ")}. ${currentGuess.length} de ${WORD_LENGTH} letras.`
    : `Palpite apagado. 0 de ${WORD_LENGTH} letras.`;
  renderBoard();
}

async function shareResult() {
  if (!game.completed) return;
  const text = createShareText(game, challenge.word);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Jogo de Palavras — Desafio diário", text });
    } else {
      await copyResult();
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    showMessage(`Não foi possível compartilhar: ${error.message}`);
  }
}

async function copyResult() {
  if (!game.completed) return;
  const text = createShareText(game, challenge.word);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const copyField = document.createElement("textarea");
      copyField.value = text;
      copyField.setAttribute("readonly", "");
      copyField.className = "visually-hidden";
      document.body.append(copyField);
      copyField.select();
      const copied = document.execCommand("copy");
      copyField.remove();
      if (!copied) throw new Error("O navegador não autorizou a cópia.");
    }
    showMessage("Resultado copiado, sem revelar a resposta.");
  } catch (error) {
    showMessage(`Não foi possível copiar o resultado: ${error.message}`);
  }
}

function openDialog(dialog) {
  dialog.showModal();
}

$("#start-game").addEventListener("click", () => {
  $("#game-section").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#game-section").focus({ preventScroll: true });
});

$("#submit-guess").addEventListener("click", submitGuess);
$("#keyboard").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button || button.disabled) return;
  if (button.dataset.key === "ENTER") submitGuess();
  else if (button.dataset.key === "BACKSPACE") removeLetter();
  else enterLetter(button.dataset.key);
});

document.addEventListener("keydown", (event) => {
  const openModal = document.querySelector("dialog[open]");
  if (openModal) {
    if (event.key === "Escape") openModal.close();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const focusedControl = event.target instanceof Element
    && event.target.closest("button, a, input, textarea, select, [contenteditable='true']");
  if (event.key === "Enter" && focusedControl) return;
  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    removeLetter();
  } else if (/^\p{L}$/u.test(event.key)) {
    enterLetter(event.key);
  }
});

$("#open-rules").addEventListener("click", () => openDialog($("#rules-dialog")));
$("#open-stats").addEventListener("click", () => {
  renderStatsDialog();
  openDialog($("#stats-dialog"));
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
$("#share-result").addEventListener("click", shareResult);
$("#copy-result").addEventListener("click", copyResult);
$("#theme-toggle").addEventListener("click", () => {
  theme = theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("palavra-do-dia:theme", theme);
  } catch (error) {
    showMessage(`O tema mudou, mas não foi possível salvar essa preferência: ${error.message}`);
  }
});

render();
