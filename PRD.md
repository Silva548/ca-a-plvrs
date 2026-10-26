# PRD — Palavra do Dia

**Data:** 2026-10-21  
**Status:** Implementado como MVP local-first  
**Documento de planejamento:** [`docs/plans/2026-10-21-jogo-diario-de-palavras.md`](./docs/plans/2026-10-21-jogo-diario-de-palavras.md)

## Visão e objetivo

Palavra do Dia é um jogo casual, gratuito e responsivo de adivinhação de palavras em português. A pessoa recebe um desafio temático diário, faz até seis palpites e usa pistas por letra para encontrar a resposta. O produto prioriza uma partida rápida, entendimento imediato, acessibilidade e um hábito diário sem cadastro ou monetização.

**Público:** crianças, adolescentes e jovens; linguagem apropriada para todas as idades.  
**Plataforma:** web mobile-first, sem dependências de serviços remotos para jogar.  
**Princípio:** progresso armazenado apenas no navegador, sem coleta de dados pessoais.

## Problema e proposta de valor

Jogos de palavras podem ser difíceis de começar quando regras são longas, feedback depende só de cor ou a dificuldade não é explicada. O produto propõe um desafio simples, tema visível, teclado físico e virtual, pistas acompanhadas por símbolos e uma grade compartilhável que não revela a solução.

## Objetivos do MVP

- Permitir concluir um desafio diário em poucos minutos, sem cadastro.
- Ensinar a mecânica com instruções breves e feedback imediato.
- Registrar resultados, vitórias e sequência diária neste dispositivo.
- Funcionar em telas pequenas, teclado físico e teclado virtual.
- Compartilhar o resultado sem divulgar palavra ou dados pessoais.

## Não objetivos do MVP

- Contas, sincronização entre dispositivos, leaderboard ou multiplayer.
- Monetização, anúncios, compras, notificações ou integrações externas.
- Dicionário irrestrito ou serviço de validação online.
- Recompensas complexas, personalização de dificuldade ou categorias escolhidas pelo usuário.

## Público e necessidades

Pessoas de 8 a 18 anos que usam celular ou computador e querem um passatempo curto. Precisam entender a regra sem tutorial longo, identificar as pistas sem depender só de cor, jogar por toque ou teclado e ver o próprio progresso sem criar conta. A interface e o vocabulário devem permanecer adequados a menores.

## Experiência e fluxo principal

1. A pessoa vê o tema e o desafio do dia na página inicial.
2. Inicia ou continua o tabuleiro do dia; cada resposta válida revela pistas.
3. A pessoa vence ao acertar ou perde após seis respostas válidas.
4. A resposta só é revelada depois do encerramento.
5. O resultado fica salvo e a pessoa pode consultar estatísticas e compartilhar uma grade sem solução.

## Regras do produto

- Um desafio para todos por data no fuso fixo `America/Sao_Paulo`.
- A data escolhe uma entrada do banco local por índice cíclico determinístico; todas as palavras de resposta são distintas, então não se repetem até percorrer o banco inteiro.
- Cada palavra tem cinco letras, contando letras acentuadas como uma letra.
- No máximo seis palpites válidos. Tentativas inválidas não contam.
- Verde/✓: letra na posição correta; amarelo/↗: letra existente em outra posição; cinza/−: letra ausente.
- Letras duplicadas seguem contagem por ocorrências: verdes são resolvidos primeiro e ocorrências excedentes ficam ausentes.
- Comparação ignora caixa e marcas de acento/cedilha; a resposta final mantém a grafia correta do banco, incluindo acentos onde necessário.
- O vocabulário de respostas é menor que o vocabulário de palpites. O validador não depende de API.
- Não são aceitas palavras de tamanho incorreto, fora do vocabulário ou já tentadas no mesmo desafio.
- Partida concluída não pode ser jogada novamente naquele dia, inclusive após recarregar.
- Uma partida conta nas estatísticas ao ser concluída, em vitória ou derrota.
- Streak é a sequência de datas consecutivas com partidas concluídas; permanece ativa durante o dia corrente após jogar ontem e zera após um dia completo sem conclusão.

## Funcionalidades

### Tela inicial

- Marca textual, chamada principal, explicação curta, tema e tamanho do desafio.
- Acesso às instruções, estatísticas e tema claro/escuro.
- Botão para ir ao tabuleiro.

### Partida

- Seis linhas de cinco letras, teclado na tela, teclado físico, apagar e enviar.
- Atualização imediata e resumo textual acessível das pistas.
- Mensagens para tamanho, palavra inválida, tentativa repetida e encerramento.
- Estado em andamento salvo localmente.

### Resultado e estatísticas

- Vitória/derrota, resposta, tentativas utilizadas, streak e percentual de acerto.
- Total de partidas concluídas, vitórias, acerto percentual, streak atual/melhor e até 30 resultados recentes.
- Compartilhamento nativo quando disponível, com opção de copiar como fallback.
- Texto compartilhado contém estado, contagem e quadrados de cor; não inclui a solução.

### Banco de palavras inicial

Categorias: animais, comidas, natureza, esportes, ciência, tecnologia, escola e cultura digital. Banco de respostas e lista de palpites aceitos ficam em módulo dedicado. A lista é intencionalmente pequena para o MVP e pode ser ampliada depois de revisão editorial.

## Requisitos não funcionais e acessibilidade

- HTML semântico, responsivo e mobile-first; botões com alvo visual de pelo menos 24×24 CSS px.
- Navegação funcional por teclado, foco visível, nome/rotulagem de controles e mensagem anunciada por leitores de tela.
- Cor não é a única informação de status: símbolos e descrição textual acompanham as pistas.
- Contraste e tipografia legível; preferência de movimento reduzido respeitada.
- Tema claro/escuro, sem efeitos necessários para compreender ou jogar.
- Nenhuma chamada de rede é necessária para jogar ou validar palavras.
- Mensagens explícitas em falhas de armazenamento; se storage falhar, sessão continua em memória e avisa que não persistirá.

## Persistência, privacidade e limites

`localStorage` guarda somente os jogos concluídos/em andamento e a preferência de tema. Não são armazenados nome, idade, localização, identificadores ou dados analíticos. Remover os dados do site, usar navegação privada ou trocar de dispositivo pode apagar/indisponibilizar o histórico. Não há sincronização.

## Métricas

Indicadores que podem ser calculados apenas a partir do histórico local: conclusão, vitórias, taxa de acerto, tentativas por partida, streak atual/melhor e compartilhamentos iniciados pela interface. Sem analytics, métricas de retenção agregadas não são observadas pelo MVP e não devem ser inferidas a partir de dados inexistentes.

## Critérios de aceite

- A data, categoria e palavra são determinísticas para todos no mesmo fuso e data.
- A avaliação de letras repetidas não excede ocorrências da solução.
- O jogo aceita seis palpites, encerra em vitória/derrota e persiste seu estado.
- Palavras inválidas, tamanho errado e duplicatas recebem mensagem e não contam.
- Acentos e cedilha são normalizados corretamente para comparação.
- Resultado e compartilhamento não revelam a solução antes/depois de forma indevida; resultado copiado não contém a palavra.
- Estatísticas/streak são calculadas sem dupla contagem.
- Tabuleiro e interação são utilizáveis em larguras estreitas e sem mouse.
- Testes cobrem lógica, persistência, estatísticas e comportamento responsivo/acessibilidade verificável.

## Decisões e riscos

- **Data do jogo:** fuso São Paulo fixo para consenso nacional; viajantes podem ter a virada do desafio em horário diferente do local. A implementação não oferece seletor de fuso.
- **Vocabulário:** lista pequena pode rejeitar palpites legítimos; aumentar só com revisão linguística e testes.
- **Sem backend:** não há sincronização nem proteção contra manipulação do armazenamento local, que é aceitável para estatísticas pessoais de MVP.
- **Fonte externa:** fontes tipográficas web são aprimoramento visual; caso estejam offline, há fallback local.

## Referências

- Projeto/referência fornecida: [guia de planejamento e execução do jogo](https://www.invertexto.com/abav00).
- [Google Codelab — Beyond vibe coding for the web](https://codelabs.developers.google.com/codelabs/beyond-vibe-coding-for-the-web?hl=pt-br): PRD, prototipagem no navegador, especificação antes da implementação e verificação.
- [WCAG 2.2 — uso da cor](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [teclado](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) e [tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
