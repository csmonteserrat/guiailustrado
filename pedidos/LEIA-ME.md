# Pedidos

Esta pasta guarda a página de análise do consumo dos materiais e os arquivos que ela lê. A página serve para decidir quais materiais entram no próximo pregão, quais podem sair e em que quantidade, olhando o município como um todo.

| Arquivo | Para que serve |
|---|---|
| `pedidos.html` | A página. Abre pelo painel de administração, no item **Pedidos**. |
| `saidas.csv` | Saídas da BRANET por código e por mês, somadas para o município. |
| `importacoes.csv` | Registro de cada relatório importado: período, recorte, meses gravados e ignorados. |
| `unioes.csv` | Códigos da BRANET ligados a um material do catálogo por esta página, com o fator de conversão. |
| `marcacoes.csv` | Meses marcados à mão (falta de estoque, saída atípica maior ou menor) e observações escritas, por material. |
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

`marcacoes.csv`: `codigo_catalogo`, `mes`, `tipo`, `observacao`, `marcado_em`, `marcado_por`.

* `tipo` é `falta` (mês sem saída por falta de estoque), `atipico_maior` (saída acima do normal: pedido administrativo, remanejamento por validade, campanha), `atipico_menor` (saída abaixo do normal: racionamento, falta parcial) ou vazio.
* `observacao` é opcional. Linha com tipo vazio é só uma observação sobre o mês; linha com `mes` vazio é uma observação geral do material.
* Na página: clicar num mês sem saída marca ou desmarca falta, sem perguntar; clicar num mês com saída abre a escolha entre atípica maior e menor. As observações aparecem nas **Notas** do material, recolhidas, com data e autor. Marca sem observação não vira nota.

## Como a página liga os códigos

1. Pelo `branet.csv`: o código atual de cada material, com fator 1.
2. Pelo `unioes.csv`: códigos antigos ou trocados, com o fator informado. Um material pode ter vários códigos, e as saídas de todos se somam.

A aba **Unir códigos** lista os códigos com saída que ainda não estão ligados a nada, sugere o material e o fator, e mostra como fica a série unida.

## Os cálculos

* **CMM**: média dos últimos 12 meses, sem os meses marcados (falta ou atípico). Se sobrarem menos de 6 meses válidos, usa os últimos 24; se ainda faltar, o material aparece como histórico insuficiente.
* **ABC**: dentro de cada família do catálogo, pelo CMM × 12, na unidade do catálogo. A até 80%, B até 95%, C o resto.
* **XYZ**: coeficiente de variação mensal. X abaixo de 0,5, Y até 1, Z acima de 1.
* **Sugestões**: só nos últimos 12 meses e só para material com saída em pelo menos 2 de cada 3 meses. **Possível falta**: dois ou mais meses seguidos sem saída. **Possível pico**: mês acima de 3 vezes a mediana dos meses normais, ou de 1,5 vez logo depois de um mês marcado como falta. **Possível efeito**: até 3 meses depois de uma saída atípica, abaixo da metade da mediana. A página só aponta; a marca é feita clicando no mês, na aba Materiais. Não há limite automático de pico.
* **Próximo pregão**: CMM × vigência × (1 + margem da classe) ÷ fator da embalagem. Ainda não desconta o saldo em estoque, porque esse dado não existe aqui. Quando houver a posição de estoque mensal, ela deve entrar numa pasta `estoque/` desta.

O documento com a explicação completa, os exemplos e as referências é o **Cálculo da página Pedidos**.
