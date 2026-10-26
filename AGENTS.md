# Instruções do projeto

- Os PRDs devem ser sempre criados na raiz do projeto atual, seguindo o formato `docs/plans/{{YYYY-MM-DD}}-{{descrição}}.md`.
- Preserve a stack existente; prefira HTML, CSS e JavaScript nativos quando não houver framework.
- Mantenha a lógica do jogo, o banco de palavras, a persistência e a interface em módulos separados.
- Não adicione dependências sem necessidade. Execute `npm test` antes de concluir mudanças de lógica.
- Garanta acessibilidade por teclado, foco visível e mensagens que não dependam apenas de cor.
