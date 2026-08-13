# Editor do catálogo

Esta pasta contém a ferramenta de edição da lista de materiais e o registro de tudo o que já foi alterado.

| Arquivo | Para que serve |
|---|---|
| `editor-catalogo.html` | A ferramenta de edição. Abre no navegador. |
| `historico.md` | O registro acumulado de todas as alterações. Pode ser lido direto aqui no GitHub. |
| `historico.html` | Página de consulta do histórico, com filtros por tipo e agrupamento por material. |
| `comparar-celk.html` | Compara os relatórios de listagem do CELK com o catálogo e aponta as diferenças. |
| `lib/` | Biblioteca de leitura de PDF, usada apenas pelo comparador. Não precisa ser editada. |
| `LEIA-ME.md` | Este arquivo. |

O arquivo de dados, `produtos.csv`, **não fica aqui**: ele permanece na raiz do repositório, porque é lido pelo site do catálogo.

## Como editar a lista de materiais

1. Abra o editor pelo endereço publicado, acrescentando `/editor-catalogo/editor-catalogo.html` ao endereço do site.
2. Confira, no botão **Histórico**, se aparece a mensagem de que o `historico.md` foi lido. Isso garante que os registros anteriores não serão perdidos.
3. Faça as alterações: buscar o item, clicar nele, editar e salvar. Use **Novo item** para acrescentar.
4. Clique em **Conferir e baixar**. Revise a lista de alterações e os avisos.
5. Será baixado um arquivo `.zip` contendo:
   - `produtos.csv`, que substitui o arquivo na **raiz** do repositório;
   - `editor-catalogo/historico.md`, que substitui o arquivo **desta pasta**.

   As pastas dentro do pacote são as mesmas do repositório, então basta descompactar por cima da pasta do projeto. O pacote também serve para enviar por email a quem for publicar.
6. Envie os dois arquivos ao GitHub. Só depois disso confirme a pergunta de "marcar como concluídas".

## Cuidados

**Envie sempre os dois arquivos do pacote.** Se você atualizar só o `produtos.csv`, o histórico fica defasado. Se atualizar só o `historico.md`, ele registra uma alteração que não aconteceu.

**Prefira inativar a excluir.** Marcar um item como inativo tira ele do catálogo e mantém a linha no arquivo, o que preserva o registro e permite voltar atrás. Excluir apaga a linha de vez.

**Ao mudar o código de um item, renomeie também a foto**, já que o nome da imagem é o código. O editor avisa quando isso acontece.

**Abrindo o arquivo direto do disco**, o navegador bloqueia a leitura automática do `produtos.csv` e do `historico.md`. Nesse caso, escolha os arquivos manualmente pelos botões da própria página. Pelo endereço publicado, tudo carrega sozinho.

## Sobre o histórico

Cada edição gera um bloco no `historico.md` com data, autor, resumo e o detalhamento campo a campo, mostrando o valor anterior e o novo. O texto é legível diretamente no GitHub.

Ao final de cada bloco há um comentário técnico entre `<!--` e `-->`, invisível na leitura formatada. É ele que permite ao editor reconstruir o histórico com precisão. Não apague esses comentários.

O nome do autor é perguntado na primeira vez que você baixa os arquivos e fica salvo no navegador. Cada pessoa que editar terá o próprio nome registrado nas sessões que fizer.


## Comparar com o CELK

A página `comparar-celk.html` lê os relatórios de listagem de produtos exportados do CELK e mostra o que mudou desde a última atualização do catálogo.

Envie de um a quatro relatórios, um por subgrupo. A ferramenta reconhece sozinha qual subgrupo cada arquivo contém e **compara apenas os subgrupos enviados**, para que os materiais dos demais não sejam apontados como ausentes por engano.

As divergências vêm separadas por tipo, cada uma com uma sugestão de ação e uma caixa de seleção:

* **Códigos novos no CELK**, que serão acrescentados ao catálogo.
* **Itens inativos que voltaram a aparecer** no relatório.
* **Códigos ausentes no CELK**, que talvez devam ser inativados.
* **Mudança de subgrupo**, quando o item migrou de grupo.
* **Descrição ou unidade diferente** entre o CELK e o catálogo.

Nada é aplicado automaticamente. O CELK também tem erros de cadastro, e há casos em que o catálogo está certo e o relatório errado, então a decisão é sempre de quem mantém o catálogo. Por isso as alterações mais arriscadas, como adotar uma descrição do CELK sobre uma correção já feita, vêm desmarcadas.

Ao aplicar, as alterações entram na sessão atual do editor e seguem o caminho normal de conferência e download. O histórico registra a origem, com a data de emissão do relatório e quem o emitiu, dados que vêm do rodapé do próprio PDF.

**Quando o CELK passar a exportar em CSV ou Excel**, a leitura fica mais confiável e a pasta `lib/` deixa de ser necessária. O resto da ferramenta continua igual.
