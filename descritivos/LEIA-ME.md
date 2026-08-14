# Descritivos

Esta pasta contém a página de consulta dos descritivos técnicos que compõem os empenhos de compra, e o arquivo onde esses descritivos ficam guardados.

| Arquivo | Para que serve |
|---|---|
| `descritivos.html` | Página de consulta. Abre pelo painel de administração. |
| `descritivos.csv` | Os descritivos de cada material. |
| `LEIA-ME.md` | Este arquivo. |

## O que entra aqui

Somente materiais da odontologia. Os itens da lista da Enfermagem, marcados no `produtos.csv` com acesso `COORDENACAO`, não recebem descritivo, por não serem objeto destes empenhos. O editor reconhece isso sozinho e nem exibe os campos para eles.

Materiais inativos continuam no arquivo, e a página tem uma opção para exibi-los, útil quando se precisa consultar a redação de um item que saiu de linha.

## Como consultar

A página lê o `produtos.csv`, da raiz, e o `descritivos.csv`, desta pasta. A ligação entre os dois é o código do material. Clique em qualquer linha para abrir os dados completos.

A busca tem dois modos, alternados pelo botão ao lado do campo:

* **Títulos** procura no nome, no código, no nome usado no descritivo e na classificação.
* **Descritivos** procura dentro do texto dos descritivos, o que serve para localizar redações semelhantes e padronizá-las. Buscar por `aço inoxidável` ou `estéril`, por exemplo, mostra todos os descritivos que usam esses termos, com o trecho encontrado em destaque.

O botão **Exportar** gera um CSV com os itens que estiverem na listagem no momento, respeitando busca e filtros. Serve para levar a redação pronta para o processo de compra.

## Como editar

**A edição não acontece aqui.** Esta página é somente de consulta. Todo o preenchimento é feito no editor do catálogo, em `editor-catalogo/editor-catalogo.html`, na mesma janela onde se editam os dados do material. Ao abrir um item para editar, a seção **Descritivo** fica abaixo dos campos do catálogo.

Três campos são preenchidos ali:

* **Nome no descritivo.** Deixe em branco para usar o mesmo nome do catálogo. Preencha apenas quando a redação do descritivo exigir um nome diferente do usado no catálogo.
* **Descritivo.** O texto técnico completo.
* **Unidade de compra.** Diferente da unidade de pedido do CELK. A unidade de pedido é como o dentista solicita; a de compra é como o material é adquirido na licitação.

A data e o autor da última modificação são preenchidos automaticamente, e **só mudam quando algum desses três campos muda**. Corrigir uma tag ou uma família no catálogo não altera o registro de modificação do descritivo.

## Sobre os arquivos gerados

Ao baixar o pacote no editor, **só entram os arquivos que realmente mudaram**. Se você editou apenas descritivos, o pacote traz `descritivos/descritivos.csv` e o histórico. Se editou apenas o catálogo, traz `produtos.csv` e o histórico. Se mexeu nos dois, traz os três.

O histórico é único e fica em `editor-catalogo/historico.md`, registrando as alterações do catálogo e dos descritivos na mesma linha do tempo, cada uma identificada pelo seu tipo.

## Preenchimento em massa

O `descritivos.csv` pode ser aberto no Excel ou LibreOffice para preencher vários descritivos de uma vez. Se fizer isso, salve como **CSV UTF-8 (delimitado por vírgulas)** e mantenha as colunas na mesma ordem. Ao preencher pela planilha, lembre de escrever também a data e o nome no formato usado pelo editor, já que o preenchimento automático só acontece na edição pela página.
