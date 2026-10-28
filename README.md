# Palavra do Dia

Jogo diário de adivinhação de palavras em português. Feito com HTML, CSS e JavaScript nativos, sem dependências de runtime ou cadastro.

## Executar

Requer Node.js 18 ou mais recente.

```sh
npm start
```

Abra <http://localhost:4173>. Para comparar as três rotas visuais, acesse <http://localhost:4173/prototypes.html>.

## Testar

```sh
npm test
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm test` executa os testes unitários. `npm run test:e2e` executa fluxos de interface, acessibilidade automatizada e responsividade em Chromium, Firefox e WebKit. A instalação dos navegadores é necessária uma vez; em Linux, o Playwright pode solicitar bibliotecas de sistema adicionais.

## Documentação

- [`PRD.md`](./PRD.md) — requisitos do produto.
- [`docs/plans/2026-10-21-jogo-diario-de-palavras.md`](./docs/plans/2026-10-21-jogo-diario-de-palavras.md) — cópia datada do PRD.
- [`SPECS.md`](./SPECS.md) — arquitetura, regras técnicas e estratégia de testes.
- [`AGENTS.md`](./AGENTS.md) — instruções de desenvolvimento deste projeto.

O progresso fica somente no armazenamento local do navegador; não sincroniza entre dispositivos e pode ser apagado ao limpar os dados do site.