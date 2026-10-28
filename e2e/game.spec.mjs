import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getDateKey, getDailyChallenge, normalizeWord } from "../src/game-logic.mjs";
import { ACCEPTED_GUESSES } from "../src/word-bank.mjs";

const progressKey = "palavra-do-dia:progress:v1";
const challengeAnswer = getDailyChallenge(getDateKey()).word;
const answer = normalizeWord(challengeAnswer);
const displayedAnswer = challengeAnswer.toLocaleUpperCase("pt-BR");
const wrongGuesses = [...new Set(ACCEPTED_GUESSES.map(normalizeWord))]
  .filter((word) => word !== answer);

async function enterGuess(page, word) {
  for (const letter of normalizeWord(word)) await page.keyboard.press(letter);
  await page.locator("#submit-guess").click();
}

async function enterGuessWithEnter(page, word) {
  for (const letter of normalizeWord(word)) await page.keyboard.press(letter);
  await page.keyboard.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("permite vencer pelo teclado e revela a resposta somente ao concluir", async ({ page }) => {
  await expect(page.locator("#result-panel")).toBeHidden();
  await enterGuessWithEnter(page, answer);

  await expect(page.locator("#result-title")).toHaveText("Mandou bem!");
  await expect(page.locator("#answer-reveal")).toHaveText(displayedAnswer);
  await expect(page.locator("#submit-guess")).toBeDisabled();
  await expect(page.locator("#keyboard button[data-key='A']")).toBeDisabled();
});

test("permite digitar, apagar e enviar uma palavra pelo teclado virtual", async ({ page }) => {
  const letters = [...answer];
  for (const letter of letters) await page.locator(`#keyboard [data-key='${letter}']`).click();
  await page.locator("#keyboard [data-key='BACKSPACE']").click();
  await page.locator(`#keyboard [data-key='${letters.at(-1)}']`).click();
  await page.locator("#keyboard [data-key='ENTER']").click();

  await expect(page.locator("#result-title")).toHaveText("Mandou bem!");
});

test("ignora tentativa inválida, rejeita repetição e restaura progresso após recarga", async ({ page }) => {
  await enterGuess(page, "zzzzz");
  await expect(page.locator("#toast")).toContainText("não está no nosso vocabulário");
  await expect(page.locator("#attempt-count")).toHaveText("6 tentativas restantes");
  for (let index = 0; index < 5; index += 1) await page.keyboard.press("Backspace");

  const firstGuess = wrongGuesses[0];
  await enterGuess(page, firstGuess);
  await expect(page.locator("#attempt-count")).toHaveText("5 tentativas restantes");
  await enterGuess(page, firstGuess);
  await expect(page.locator("#toast")).toContainText("já tentou essa palavra");
  await expect(page.locator("#attempt-count")).toHaveText("5 tentativas restantes");

  await page.reload();
  await expect(page.locator("#attempt-count")).toHaveText("5 tentativas restantes");
  const savedGuesses = await page.evaluate((key) => {
    const games = JSON.parse(localStorage.getItem(key)).games;
    return games[Object.keys(games)[0]].guesses;
  }, progressKey);
  expect(savedGuesses).toEqual([firstGuess]);
  await expect(page.locator("#board .board-row").first()).toHaveAttribute("aria-label", /Tentativa 1:/);
  await expect(page.locator("#result-panel")).toBeHidden();
});

test("encerra em derrota após seis palpites válidos e mostra a resposta", async ({ page }) => {
  for (const guess of wrongGuesses.slice(0, 6)) await enterGuess(page, guess);

  await expect(page.locator("#result-title")).toHaveText("Quase lá!");
  await expect(page.locator("#answer-reveal")).toHaveText(displayedAnswer);
  await expect(page.locator("#attempt-count")).toHaveText("6 tentativas usadas");
});

test("mantém o jogo utilizável quando a leitura do progresso falha", async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new Error("leitura bloqueada");
      return original.call(this, name);
    };
  }, progressKey);
  await page.goto("/");
  await expect(page.locator("#toast")).toContainText("Não foi possível ler seu progresso salvo");
  await enterGuess(page, answer);
  await expect(page.locator("#result-title")).toHaveText("Mandou bem!");
});

test("informa falha de gravação sem interromper a partida", async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error("quota excedida");
      return original.call(this, name, value);
    };
  }, progressKey);
  await page.goto("/");
  await enterGuess(page, wrongGuesses[0]);
  await expect(page.locator("#toast")).toContainText("Não foi possível salvar seu progresso");
  await expect(page.locator("#attempt-count")).toHaveText("5 tentativas restantes");
});

test("diálogos têm título acessível, foco por teclado e fecham com Escape", async ({ page }) => {
  await page.locator("#open-rules").focus();
  await page.keyboard.press("Enter");
  const rules = page.locator("#rules-dialog");
  await expect(rules).toBeVisible();
  await expect(rules).toHaveAttribute("aria-labelledby", "rules-title");
  await page.keyboard.press("Escape");
  await expect(rules).toBeHidden();
});

test("não apresenta violações axe WCAG A/AA na tela principal ou no diálogo", async ({ page }) => {
  const mainResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(mainResults.violations).toEqual([]);

  await page.locator("#open-rules").click();
  const dialogResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialogResults.violations).toEqual([]);

  await page.locator("#rules-dialog").press("Escape");
  await page.locator("#theme-toggle").click();
  const darkThemeResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(darkThemeResults.violations).toEqual([]);
});

test("não cria overflow horizontal e mantém alvos de teclado com pelo menos 24px", async ({ page }) => {
  for (const width of [320, 360, 375, 430, 760, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      keySizes: [...document.querySelectorAll("#keyboard button")].map((button) => {
        const { width: keyWidth, height: keyHeight } = button.getBoundingClientRect();
        return { width: keyWidth, height: keyHeight };
      })
    }));
    expect(dimensions.scrollWidth, `overflow em ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.keySizes.every(({ width: keyWidth, height }) => keyWidth >= 24 && height >= 24)).toBe(true);
  }
});

test("persiste a preferência de tema entre recargas", async ({ page }) => {
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});