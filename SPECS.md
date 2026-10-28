# Especificação técnica — Palavra do Dia

## Resumo de arquitetura

Aplicação estática e local-first, feita com HTML semântico, CSS responsivo e JavaScript ES modules. O servidor incluído é apenas um servidor HTTP de desenvolvimento para servir arquivos sem dependências. O jogo não exige backend, build, instalação de bibliotecas ou chamadas de API.

```text
index.html ── src/app.mjs ── src/game-logic.mjs ── src/word-bank.mjs
                    │                  │
                    ├── src/persistence.mjs ── localStorage
                    └── DOM / Web Share / Clipboard

prototypes.html + prototypes.css  (estudos comparativos de UI)
tests/game-logic.test.mjs         (Node.js test runner)
```

## Arquivos e responsabilidades

- `src/word-bank.mjs`: banco separado de respostas categorizadas e vocabulário aceito para palpites.
- `src/game-logic.mjs`: normalização, data do jogo, seleção diária, validação, pontuação duplicada, aplicação de palpite e estatísticas puras.
- `src/persistence.mjs`: chave/versionamento de persistência, validação de dados lidos e operações de salvar/carregar.
- `src/app.mjs`: estado de tela, renderização do tabuleiro/teclado/estatísticas, eventos e integrações de navegador.
- `index.html`, `styles.css`: interface do jogo e regras/instruções acessíveis.
- `prototypes.html`, `prototypes.css`: três alternativas para comparação e registro da decisão.
- `tests/game-logic.test.mjs`: testes de regras, banco de palavras, persistência, streak, datas e compartilhamento.
- `e2e/game.spec.mjs`: fluxos de navegador, tratamento de falhas de storage, auditoria axe e responsividade.
- `playwright.config.mjs`: execução dos mesmos testes em Chromium, Firefox e WebKit.
- `server.mjs`: servidor local simples para desenvolvimento.

## Modelo de dados

```js
{
  version: 1,
  games: {
    "AAAA-MM-DD": {
      guesses: ["PALMA", "COBRA"],
      completed: true,
      won: true,
      answer: "cobra"
    }
  }
}
```

Uma partida incompleta tem `completed: false`, `won: false`, `answer: null`. O objeto da resposta só é gravado quando o jogo encerra. Tentativas são guardadas normalizadas em maiúsculas sem diacríticos. Chave: `palavra-do-dia:progress:v1`. Preferência visual independente: `palavra-do-dia:theme`.

## Regras e algoritmos

### Data e desafio

- Derivar a data com `Intl.DateTimeFormat(..., { timeZone: "America/Sao_Paulo" })`.
- Converter a data ISO para dia UTC e calcular o deslocamento em dias desde `2026-01-01`.
- Selecionar `((deslocamento % totalRespostas) + totalRespostas) % totalRespostas`.
- Isso não depende de hora local do sistema e repete o conjunto somente após percorrer a lista inteira.
- Alterar o banco/ordem em versões futuras pode alterar desafios históricos; a estratégia inicial é estável enquanto a lista não mudar.

### Normalização e validação

- Aplicar NFD, remover marcas combinantes, converter para maiúsculas pt-BR e manter apenas A–Z.
- Validar comprimento 5, presença no conjunto de palpites e não repetição no histórico daquela data.
- A lista validada é finita e editorial; não equivale a um dicionário geral.

### Pontuação

1. Inicializar cinco posições como ausentes.
2. Marcar e retirar primeiro as letras corretas em posição.
3. Contar letras restantes da resposta.
4. Percorrer letras não resolvidas do palpite; marcar presente somente se ainda houver uma ocorrência e decrementá-la.
- Esta ordem evita falsos amarelos em respostas/palpites com repetições.

### Encerramento e streak

- Vence se a tentativa normalizada for igual à resposta ou perde ao completar seis tentativas válidas.
- Persistir cada tentativa e o encerramento; a UI bloqueia entrada quando `completed` é verdadeiro.
- Só partidas concluídas integram a contagem de partidas/vitórias.
- Sequências são calculadas em dias ISO consecutivos. A sequência atual fica ativa se a última conclusão foi hoje ou ontem; após falta de um dia inteiro, é zero. A melhor sequência considera todo o histórico.
- O histórico exibido é limitado a 30 itens; os dados permanecem no navegador.

## Interface e acessibilidade

- Rota visual escolhida: “editorial lúdico”, contrastando papel claro, verde, coral e formas decorativas. As rotas arcade e jornal permanecem na página de protótipos.
- Grade de seis tentativas, teclado QWERTY na interface e interação física por letras/Enter/Backspace.
- Para digitação, o estado intermediário é normalizado e limitado a cinco caracteres. As tentativas só são persistidas ao enviar.
- Diálogo nativo `<dialog>` para instruções e estatísticas, com fechamento por botão/Escape e foco gerenciado pelo navegador.
- Região `aria-live` com descrição de cada letra; cada quadrado é acompanhado por rótulo textual da posição/status. Teclas desabilitam ao encerrar.
- Símbolos ✓, ↗, − complementam as cores verde, amarelo e cinza.
- Foco visível, link para pular ao jogo, títulos em ordem e controles nomeados.
- CSS responsivo em 760 px e 480 px; grade adapta suas células a telas estreitas; `prefers-reduced-motion` reduz animações/transições.
- Tema claro/escuro via atributo no documento; controles permanecem funcionais em ambos.

## Persistência e tratamento de falhas

- `localStorage` persiste progresso local sem dados pessoais. Recarregar preserva tentativa atual/conclusão e estatísticas.
- Leitura valida versão, chaves, tipos, contagem e tamanho das tentativas; estado inválido gera aviso e execução em memória.
- Falha de gravação mostra aviso e troca a sessão para estado em memória em vez de fingir persistência.
- Limitações: dados podem ser limpos pelo usuário/navegador; não há sincronização, backup, autenticação ou integridade contra alterações manuais.

## Compartilhamento

- Texto contém identificação do jogo, vitória X/6 ou derrota X/6 e uma linha de quadrados por tentativa.
- Nunca inclui `challenge.word`, respostas, nome ou outro dado pessoal.
- Usar `navigator.share` quando houver suporte; caso contrário, `navigator.clipboard.writeText`; último fallback é seleção/copiar via textarea.
- Cancelamento do diálogo nativo é ignorado; outras falhas são informadas explicitamente.

## Estratégia de testes e execução

- Unitários para vitória em 1/6, derrota, tentativas inválidas, duplicatas, integridade do vocabulário, repetição, acentuação/cedilha, virada diária em São Paulo, determinismo, estatísticas, streak e falhas/dados malformados do armazenamento.
- End-to-end para teclado físico e virtual, vitória, derrota, repetição, persistência após recarga, falhas de leitura/gravação, dialogs, preferência de tema e ausência de revelação prematura.
- Axe verifica critérios WCAG 2.1 A/AA na tela inicial, no diálogo e nos temas claro/escuro. Testes responsivos verificam seis larguras, overflow e tamanho mínimo de teclas.
- Executar `npm test`; instalar browsers com `npx playwright install chromium firefox webkit`; executar `npm run test:e2e`.
- Compatibilidade automatizada roda nos engines Chromium, Firefox e WebKit. A auditoria axe e as verificações de viewport não substituem leitor de tela/dispositivo físico.
- A página `prototypes.html` apresenta três comparações de interface.
- Executar `npm start` e abrir `http://localhost:4173`; protótipos em `http://localhost:4173/prototypes.html`.
- Requer Node.js 18+ e navegador moderno. Não são necessárias dependências instaladas.

### Verificação manual no navegador (2026-10-21)

- Abri a aplicação e a página de protótipos no navegador integrado.
- Conferi os viewports de 320, 360, 375, 390, 430, 760 e 1280 px; nenhum apresentou overflow horizontal depois do ajuste de largura mínima e teclado virtual.
- No viewport de 320 px, teclas mediram pelo menos 24×46 CSS px.
- Testei entrada física e virtual, mensagem para palavra desconhecida, feedback de uma tentativa, restauração após recarregar e bloqueio de tentativa repetida.
- Completei um desafio; resultado, estatísticas/streak e botão de copiar exibiram os valores esperados. A interface informou que o texto copiado não revela a resposta.
- Abri os diálogos de instruções e estatísticas usando Enter com foco no botão e fechei ambos com Escape.
- Essas verificações são manuais; não substituem teste em leitores de tela ou aparelhos físicos.

## Limitações conhecidas e evolução

- O banco inicial é deliberadamente conciso; termos válidos podem faltar. Ampliar com curadoria linguística por região, dificuldade e acentos.
- A programação cíclica depende da ordem do banco e não preserva calendário após troca editorial; pode-se versionar uma agenda de desafios.
- O idioma de interface/resposta é português brasileiro.
- O CSS importa fontes do Google Fonts para acabamento; fontes locais de fallback preservam a legibilidade sem conexão.
- Testes automatizados unitários, axe e navegadores headless não substituem auditoria assistiva manual ou avaliação com leitores de tela/dispositivos reais.
