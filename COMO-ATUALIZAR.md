# Como atualizar o catálogo

Este documento é para quem cuida do catálogo no dia a dia. **Não é preciso saber programar.**

Tudo o que aparece no site vem de **um único arquivo**, o `produtos.csv`, e de uma **pasta de fotos**, a pasta `imagens`. Se você souber mexer em uma planilha e salvar um arquivo, você consegue manter o catálogo.

---

## O que é cada arquivo

| Arquivo ou pasta | Para que serve | Você mexe? |
|---|---|---|
| `produtos.csv` | A lista de todos os materiais | **Sim, sempre** |
| `imagens/` | As fotos, uma para cada material | **Sim, sempre** |
| `index.html` | O texto do guia de uso, as ilustrações dele e o contato do responsável | Só quando quiser mudar o guia |
| `style.css` | As cores e a aparência (todas as cores ficam no bloco do topo do arquivo) | Raramente |
| `app.js` | O funcionamento do site e a data da última atualização | Raramente |

---

## 1. Adicionar um produto novo

1. Abra o arquivo `produtos.csv`.
   - No **Excel**: clique com o botão direito no arquivo, escolha *Abrir com* e depois *Excel*.
   - No **LibreOffice** ou no **Google Planilhas**: abra normalmente. Se aparecer uma janela perguntando sobre a importação, confira que a codificação é **UTF-8** e que o separador é a **vírgula**. Não marque o ponto e vírgula como separador: ele é usado *dentro* das colunas `especialidade` e `familia`, e marcá-lo parte esses valores em colunas erradas.
2. Vá até a **primeira linha vazia**, no fim da planilha. Não se preocupe com a ordem: o site coloca tudo em ordem alfabética sozinho, então o item novo aparece no lugar certo mesmo tendo sido digitado por último.
3. Preencha as colunas, uma a uma:

| Coluna | O que escrever | Exemplo |
|---|---|---|
| `codigo` | O código do material no sistema da prefeitura | `4150488` |
| `material` | O nome completo, do jeito que aparece no CELK | `ABRIDOR DE BOCA EXPANDEX ADULTO` |
| `unidade` | A unidade de pedido | `U - Unidade`, `CA - Caixa`, `PC - Pacote`, `KI - Kit`, `FR - Frasco`, `CT - Cartela` |
| `grupo` | O número do grupo | `12`, `13`, `14`, `15` |
| `subgrupo` | O nome do subgrupo | `Odontologia`, `Odontologia Instrumental`, `CEO`, `CEO Instrumental`, `Interesse Odontológico` |
| `acesso` | Quem solicita o item | `TODOS`, `CEO` ou `COORDENACAO` |
| `tipo` | `Consumo` ou `Instrumental` | `Consumo` |
| `especialidade` | Uma ou mais, separadas por **ponto e vírgula** | `Cirurgia;Odontopediatria` |
| `familia` | Uma ou mais, separadas por **ponto e vírgula** | `Brocas` ou `Brocas;Pontas de desgaste` |
| `imagem` | O nome do arquivo da foto, sempre o código com `.jpg` | `4150488.jpg` |
| `observacao` | Opcional. Um recado curto sobre o item | `Embalagem com 3 seringas` |
| `ativo` | `SIM` para aparecer no site | `SIM` |

4. Salve o arquivo **mantendo o formato CSV**. Se o Excel perguntar se você quer manter o formato, responda que **sim**.
5. Coloque a foto do produto na pasta `imagens`, com o nome igual ao código. Veja o passo 4 deste manual.
6. Publique a alteração. Veja o passo 5.

### Cuidados importantes

- **O código é texto, não número.** Se o Excel apagar um zero da frente do código, formate a coluna como *Texto* antes de digitar.
- **Não mude os nomes das colunas** da primeira linha.
- **O arquivo é separado por vírgula e gravado em UTF-8 com BOM.** Ao salvar pelo Excel, escolha *CSV UTF-8 (delimitado por vírgulas)*. Trocar o separador por ponto e vírgula faz o site parar de ler a lista.
- Se o nome do material tiver vírgula, ou se `especialidade` e `familia` tiverem mais de um valor, a planilha coloca aspas sozinha ao salvar. Isso é normal e está certo.
- Escreva `acesso` sem acento e em maiúsculas: `COORDENACAO`, e não `Coordenação`.

---

## 2. Desativar um produto

Quando um item sair de linha, **não apague a linha**. Assim o histórico não se perde e o item pode voltar depois.

1. Abra o `produtos.csv`.
2. Na coluna `ativo` daquele item, troque `SIM` por `NAO`.
3. Salve e publique.

O item desaparece do site imediatamente, e a foto pode continuar na pasta sem atrapalhar.

---

## 3. Trocar a foto de um produto

1. Prepare a nova imagem seguindo o passo 4.
2. Salve o arquivo com o **mesmo nome** do arquivo antigo, ou seja, o código do produto com `.jpg`.
3. Coloque na pasta `imagens`, substituindo o arquivo anterior.
4. Publique.

Não é preciso mexer no `produtos.csv` para trocar uma foto. Basta o arquivo ter o mesmo nome.

> Se, depois de publicar, a foto antiga continuar aparecendo, o navegador guardou a imagem na memória. Pressione **Ctrl + Shift + R** (no Mac, **Cmd + Shift + R**) para recarregar a página ignorando a memória.

---

## 4. Como preparar a imagem em 800x800

Todas as fotos devem ser **quadradas, 800 por 800 pixels, com fundo branco**, para que os cards fiquem alinhados.

Um caminho simples, sem instalar nada:

1. Abra o site de edição de imagens que você já usa, por exemplo o **Paint** do Windows, o **Fotos** do celular ou um editor on-line.
2. Recorte a imagem em formato **quadrado**, deixando o produto centralizado e com uma folga pequena nas bordas.
3. Redimensione para **800 x 800 pixels**.
4. Salve como **JPG**, com o nome igual ao **código do produto**, por exemplo `4150488.jpg`.
5. Tente deixar o arquivo com menos de **200 KB**, para o catálogo abrir rápido no celular.

Regras rápidas:

- Fundo branco, sem cenário e sem marca d'água.
- Um produto por foto.
- Nome do arquivo só com números e a extensão `.jpg`, sem espaços e sem acentos.

Se um produto ainda não tiver foto, tudo bem: o site mostra sozinho um quadro cinza com a frase *"Foto ainda não cadastrada"*. Nada quebra.

---

## 5. Como publicar a alteração

O caminho depende de onde o catálogo está hospedado. No caso do GitHub Pages:

1. Entre no repositório do catálogo pelo navegador.
2. Para trocar o `produtos.csv`: clique no arquivo, clique no ícone de lápis ou em **Upload files**, e envie a versão nova por cima.
3. Para adicionar fotos: entre na pasta `imagens`, clique em **Add file** e depois em **Upload files**, e arraste as imagens novas.
4. Escreva uma frase curta dizendo o que mudou, por exemplo *"Inclui 3 itens de endodontia"*, e confirme.
5. Espere de um a dois minutos e recarregue o site.

---

## 6. A chave de publicação

A chave é o que permite que o painel de administração envie as alterações direto ao repositório, sem baixar e reenviar arquivos à mão. Ela é criada no GitHub, na conta dona do repositório, e vale por no máximo **366 dias**. Quando vencer, é só repetir este passo a passo e distribuir a chave nova.

Cada pessoa do GT guarda a chave no próprio navegador, pelo painel. **Quem apenas recebeu a chave de alguém não precisa fazer nada aqui**: basta colar no painel e clicar em *Testar chave*, como está no passo 6.2.

### 6.1. Criar a chave

Faça isto entrando no GitHub com a conta dona do repositório, a `csmonteserrat`.

1. Abra este endereço, que já chega com quase tudo preenchido:

   ```
   https://github.com/settings/personal-access-tokens/new?name=Catalogo+GT+Materiais&expires_in=366&contents=write
   ```

   Se preferir navegar pelos menus: sua foto no canto superior direito → **Settings** → na coluna da esquerda, bem embaixo, **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.

2. Confira o que veio preenchido: *Token name* como `Catalogo GT Materiais` e *Expiration* em 366 dias. **Anote a data de vencimento na agenda.** Quando ela chegar, a publicação para de funcionar até alguém criar outra chave.

3. Em **Repository access**, marque a opção do meio, **Only select repositories**. Abre uma caixa de seleção logo abaixo: clique nela e escolha `guiailustrado`.

4. Em **Permissions** → **Repository permissions**, procure a linha **Contents** na lista, que é longa e está em ordem alfabética. No menu à direita, escolha **Read and write**.

   A linha *Metadata* fica marcada como *Read-only* sozinha. É normal e obrigatório, pode deixar.

   Não marque mais nada. Só Contents.

5. Role até o fim e clique em **Generate token**.

6. A chave aparece **uma única vez**, numa faixa verde no topo: um texto longo começando com `github_pat_`. Copie pelo botão de cópia ao lado. Se sair da página sem copiar, não há como recuperar — mas também não é problema: apague essa chave e gere outra.

### 6.2. Cadastrar a chave no painel

Abra o painel de administração, em `admin.html`, e vá ao cartão **Chave de publicação**. Cole a chave no campo, clique em **Testar chave** e preencha também o campo do seu nome.

Se aparecer o selo verde *chave ativa*, dizendo em nome de qual conta ela publica, está tudo certo. A chave fica guardada apenas naquele navegador.

### 6.3. Quando o teste acusa erro

| O que aparece | O que fazer |
|---|---|
| *O GitHub não reconheceu esta chave* | Quase sempre é cópia incompleta. Copie de novo pelo botão de cópia, não selecionando com o mouse. |
| *A chave funciona mas não tem permissão para escrever* | Faltou o passo 6.1.3 ou o 6.1.4. Dá para corrigir sem criar outra: em **Fine-grained tokens**, clique no nome da chave e ajuste. |
| *Não consegui falar com o GitHub* | Bloqueio da rede ou falta de conexão. Se acontecer sempre na mesma unidade, a publicação direta não funciona ali, e o caminho continua sendo baixar o pacote e enviar à mão. |

### 6.4. Passar a chave para as outras pessoas do GT

A chave é uma senha. **Não mande por e-mail institucional nem coloque em documento compartilhado.**

O mais seguro é digitar você mesmo no computador de cada pessoa, uma vez, e clicar em Testar. Se precisar mandar à distância, use mensagem privada e apague a mensagem depois que a pessoa confirmar que colou.

Dois combinados com o grupo:

- **Em computador compartilhado, clique em Remover chave ao terminar.**
- **Cada pessoa preenche o campo do nome no painel.** Como todos publicam com a mesma chave, as alterações aparecem no GitHub sempre no nome da conta dona dela. Esse campo é o único registro de quem fez o quê.

### 6.5. Cancelar uma chave

Se a chave vazar, se alguém sair do GT ou se você simplesmente quiser trocar: no GitHub, em **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**, clique em **Delete** ao lado do nome dela. Ela para de funcionar na hora, em todos os computadores.

Depois é só criar outra pelo passo 6.1 e distribuir de novo. Nada do que já foi publicado é afetado.

---

## 7. Mudar o texto do guia ou o contato do responsável

O texto do guia de uso está dentro do arquivo `index.html`, em um trecho marcado assim:

```
<!-- INÍCIO DO TEXTO DO GUIA — edite daqui para baixo -->
...
<!-- FIM DO TEXTO DO GUIA -->
```

Você pode alterar as frases livremente dentro desse trecho. O nome, o e-mail e o telefone do responsável estão no fim dele, marcados com um comentário próprio.

Não apague os sinais `<` e `>` nem o que estiver escrito entre eles, como `<p>` e `</p>`. Eles são as marcações que organizam o texto na tela.

**Sobre as ilustrações do guia.** Os exemplos que aparecem ali — o cartão de material com os números, as pílulas de filtro, os botões do topo — não são imagens. São pedaços do próprio site, montados com as mesmas classes que a listagem usa. Por isso, quando você mudar cor, formato ou tamanho no `style.css`, o guia muda junto sozinho, e não existe figura nenhuma para refazer.

Duas exceções, que precisariam de ajuste manual:

- Se você **trocar o desenho de algum ícone** no site, o ícone equivalente dentro do guia continua com o desenho antigo, porque ali ele é uma cópia. Procure pelo trecho `<svg` dentro da seção correspondente do guia e substitua.
- O cartão de exemplo usa a foto do item **4150488**. Se essa foto sair da pasta `imagens`, o exemplo mostra um quadro cinza escrito "Foto de exemplo", sem quebrar nada. Para usar outro material como exemplo, troque o nome do arquivo, o código e o nome do produto naquele trecho.

---

## 8. Atualizar a versão mostrada no rodapé

Abra o arquivo `app.js` e, logo nas primeiras linhas, altere a versão:

```
const VERSAO_SITE = '2026-08-16c';
```

O padrão é ano-mês-dia, mais uma letra para cada entrega feita no mesmo dia: a primeira do dia é `a`, a segunda é `b`, e assim por diante. É o mesmo padrão que aparece no rodapé das páginas administrativas.

Isso identifica a **versão do site**, ou seja, quando o visual ou o funcionamento mudaram. Não tem relação com a lista de materiais.

**A data do catálogo impresso é outra coisa e não precisa ser atualizada à mão.** No cabeçalho das páginas impressas aparece a data da última vez que a lista de materiais mudou de fato, lida sozinha do `editor-catalogo/historico.md`. Sessões que mexeram apenas em descritivos não contam, porque não alteram nada do que sai impresso.

---

## 9. Perguntas frequentes

**Abri o `index.html` com dois cliques e o site aparece só com um aviso.**
Isso é esperado. Por segurança, o navegador não deixa um arquivo aberto direto do computador ler outro arquivo, e o catálogo precisa ler o `produtos.csv`. Use o endereço publicado do catálogo.

**Criei uma especialidade ou uma família nova e ela não aparece no filtro.**
As duas listas do quadro **Filtros**, à esquerda, são montadas sozinhas a partir do `produtos.csv`: qualquer nome novo nas colunas `especialidade` ou `familia` vira uma opção assim que houver pelo menos um item ativo usando aquele nome. Confira se o nome foi escrito exatamente igual em todos os itens, com os mesmos acentos e maiúsculas. Lembre que `especialidade` aceita vários valores separados por ponto e vírgula, enquanto `familia` aceita apenas um.

**Como coloco duas famílias no mesmo item.**
Separe os nomes com ponto e vírgula, do mesmo jeito que já se faz na coluna `especialidade`. O item passa a aparecer nos dois filtros e mostra duas etiquetas no card.

Como o ponto e vírgula também é o separador das colunas do arquivo, o valor precisa estar **entre aspas** quando tiver mais de uma família. Se você estiver editando pelo Excel, LibreOffice ou Google Planilhas, basta digitar `Brocas;Pontas de desgaste` dentro da célula e as aspas são acrescentadas sozinhas na hora de salvar. Se estiver editando o arquivo direto no Bloco de Notas ou pelo GitHub, escreva você mesmo: `"Brocas;Pontas de desgaste"`.

Não coloque espaço depois do ponto e vírgula e escreva cada nome exatamente como ele já aparece nos outros itens, senão o site cria uma família nova em vez de reaproveitar a existente.

**A lista de famílias está ficando comprida.**
Isso não atrapalha: o grupo Família vem fechado e tem um campo de busca próprio. Ainda assim, evite criar famílias com um ou dois itens só — quanto mais enxuta a lista, mais útil ela fica para comparar materiais parecidos.

**Em que ordem os materiais aparecem no site?**
Em ordem alfabética pelo nome, dentro de cada bloco: primeiro os da rede básica, depois os do CEO, depois os de interesse odontológico. A ordem das linhas dentro do `produtos.csv` não influencia em nada, então você pode acrescentar itens novos sempre no fim da planilha. Números dentro do nome são comparados como números, e por isso `Nº 2` vem antes de `Nº 10`, e não depois.

**Um item ficou sem especialidade ou sem família.**
Ele continua aparecendo normalmente no catálogo, apenas sem as etiquetas. Nenhum item some por falta de classificação.

**Preciso incluir os materiais da lista da Enfermagem.**
Basta acrescentar as linhas no `produtos.csv` com `acesso` igual a `COORDENACAO` e `subgrupo` igual a `Interesse Odontológico`. A aba já existe no site e passa a listar os itens sozinha, sem nenhuma alteração de código.
