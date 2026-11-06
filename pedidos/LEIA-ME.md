# Pedidos

Esta pasta guarda a página de análise do consumo dos materiais e os arquivos que ela lê. A página serve para decidir quais materiais entram no próximo pregão, quais podem sair e em que quantidade, olhando o município como um todo.

| Arquivo | Para que serve |
|---|---|
| `pedidos.html` | A página. Abre pelo painel de administração, no item **Pedidos**. |
| `saidas.csv` | Saídas da BRANET por código e por mês, somadas para o município. |
| `importacoes.csv` | Registro de cada relatório importado: período, recorte, meses gravados e ignorados. |
| `unioes.csv` | Códigos da BRANET ligados a um material do catálogo por esta página, com o fator de conversão. |
| `faltas.csv` | Meses marcados como falta no almoxarifado, por material. |
| `lib/xlsx.full.min.js` | Biblioteca SheetJS 0.18.5, que lê os relatórios .xls no navegador. Licença Apache 2.0, em `lib/xlsx.LICENSE.txt`. |
| `LEIA-ME.md` | Este arquivo. |

Formato igual ao dos outros arquivos de dados: separado por vírgula, UTF-8 com BOM, fim de linha CRLF.

**Nada desta página altera o `produtos.csv` nem o `branet.csv`.**

## De onde vêm os dados

Do relatório **Consumo por Período (12 meses)** da BRANET, em .xls. São as saídas (dispensação) para todos os centros de custo, ou seja, o consumo real. O relatório sai por recorte, e os três se completam, sem repetir itens:

* Grupo Odontologia, classificação Odontologia;
* Grupo Odontologia Instrumental, classificação Odontologia Instrumental;
* Grupo Odontologia, classificação Todos.

Para importar, use o botão **Importar relatórios** no alto da página. Cada mês de cada código é gravado por cima do que já existir. O mês em que o relatório foi emitido, e os seguintes, ficam de fora, porque ainda estão incompletos: um relatório de 2026 emitido em 06/11/2026 grava de janeiro a outubro.

Os pedidos do CELK não entram por enquanto.

## Colunas

`saidas.csv`: `codigo_branet`, `nome_branet`, `mes` (aaaa-mm), `quantidade`. Só entram meses com saída; mês sem linha é mês sem saída.

`unioes.csv`: `codigo_branet`, `nome_branet`, `codigo_catalogo`, `fator`, `decisao`, `decidido_em`, `decidido_por`.

* `decisao` é `unir` ou `fora_do_catalogo`.
* `fator` divide a quantidade da BRANET para chegar à unidade do catálogo. O sacolé sai da BRANET por unidade e o catálogo conta em pacote com 100: fator 100.

`faltas.csv`: `codigo_catalogo`, `mes`, `motivo`, `marcado_em`, `marcado_por`.

## Como a página liga os códigos

1. Pelo `branet.csv`: o código atual de cada material, com fator 1.
2. Pelo `unioes.csv`: códigos antigos ou trocados, com o fator informado. Um material pode ter vários códigos, e as saídas de todos se somam.

A aba **Unir códigos** lista os códigos com saída que ainda não estão ligados a nada, sugere o material e o fator, e mostra como fica a série unida.

## Os cálculos

* **CMM**: média dos últimos 12 meses, sem os meses marcados como falta.
* **ABC**: dentro de cada família do catálogo, pela quantidade convertida para a unidade do catálogo. A até 80%, B até 95%, C o resto.
* **XYZ**: coeficiente de variação mensal. X abaixo de 0,5, Y até 1, Z acima de 1.
* **Possível falta**: dois ou mais meses seguidos sem saída num material que sai com regularidade. A página só aponta; a confirmação é feita clicando no mês, na aba Materiais.
* **Próximo pregão**: CMM × vigência × (1 + margem da classe) ÷ fator da embalagem. Ainda não desconta o saldo em estoque, porque esse dado não existe aqui. Quando houver a posição de estoque mensal, ela deve entrar numa pasta `estoque/` desta.

O documento com a explicação completa, os exemplos e as referências é o **Cálculo da página Pedidos**.
