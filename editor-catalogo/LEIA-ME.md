# Editor do catálogo

Esta pasta contém a ferramenta de edição da lista de materiais e o registro de tudo o que já foi alterado.

| Arquivo | Para que serve |
|---|---|
| `editor-catalogo.html` | A ferramenta de edição. Abre no navegador. |
| `historico.md` | O registro acumulado de todas as alterações. Pode ser lido direto aqui no GitHub. |
| `LEIA-ME.md` | Este arquivo. |

O arquivo de dados, `produtos.csv`, **não fica aqui**: ele permanece na raiz do repositório, porque é lido pelo site do catálogo.

## Como editar a lista de materiais

1. Abra o editor pelo endereço publicado, acrescentando `/editor-catalogo/editor-catalogo.html` ao endereço do site.
2. Confira, no botão **Histórico**, se aparece a mensagem de que o `historico.md` foi lido. Isso garante que os registros anteriores não serão perdidos.
3. Faça as alterações: buscar o item, clicar nele, editar e salvar. Use **Novo item** para acrescentar.
4. Clique em **Conferir e baixar**. Revise a lista de alterações e os avisos.
5. Serão baixados dois arquivos:
   - `produtos.csv`, que substitui o arquivo na **raiz** do repositório;
   - `historico.md`, que substitui o arquivo **desta pasta**.
6. Envie os dois ao GitHub. Só depois disso confirme a pergunta de "marcar como concluídas".

## Cuidados

**Envie sempre os dois arquivos juntos.** Se você atualizar só o `produtos.csv`, o histórico fica defasado. Se atualizar só o `historico.md`, ele registra uma alteração que não aconteceu.

**Prefira inativar a excluir.** Marcar um item como inativo tira ele do catálogo e mantém a linha no arquivo, o que preserva o registro e permite voltar atrás. Excluir apaga a linha de vez.

**Ao mudar o código de um item, renomeie também a foto**, já que o nome da imagem é o código. O editor avisa quando isso acontece.

**Abrindo o arquivo direto do disco**, o navegador bloqueia a leitura automática do `produtos.csv` e do `historico.md`. Nesse caso, escolha os arquivos manualmente pelos botões da própria página. Pelo endereço publicado, tudo carrega sozinho.

## Sobre o histórico

Cada edição gera um bloco no `historico.md` com data, autor, resumo e o detalhamento campo a campo, mostrando o valor anterior e o novo. O texto é legível diretamente no GitHub.

Ao final de cada bloco há um comentário técnico entre `<!--` e `-->`, invisível na leitura formatada. É ele que permite ao editor reconstruir o histórico com precisão. Não apague esses comentários.

O nome do autor é perguntado na primeira vez que você baixa os arquivos e fica salvo no navegador. Cada pessoa que editar terá o próprio nome registrado nas sessões que fizer.
