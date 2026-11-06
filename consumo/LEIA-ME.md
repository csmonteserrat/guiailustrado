# Análise de Consumo

Esta pasta guarda a página de análise do consumo dos materiais e os arquivos que ela lê. A página serve para decidir quais materiais entram no próximo pregão, quais podem sair e em que quantidade, olhando o município como um todo.

| Arquivo | Para que serve |
|---|---|
| `consumo.html` | A página Análise de Consumo. Abre pelo painel de administração, no item **Consumo**. |
| `saidas.csv` | Saídas da BRANET por código e por mês, somadas para o município. |
| `importacoes.csv` | Registro de cada relatório importado: período, recorte, meses gravados e ignorados. |
| `unioes.csv` | Códigos da BRANET ligados a um material do catálogo por esta página, com o fator de conversão. |
| `marcacoes.csv` | Meses marcados à mão (falta de estoque, saída atípica maior ou menor) e observações escritas, por material. |
| `descontinuados.csv` | Materiais do catálogo marcados como descontinuados nesta página, com o motivo. |
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

`unioes.csv`: `codigo_branet`, `nome_branet`, `codigo_catalogo`, `fator`, `decisao`, `motivo`, `observacao`, `decidido_em`, `decidido_por`.

* `decisao` é `unir`, `descontinuado` (material que deixou de existir, sem nada no catálogo para unir) ou `fora_do_catalogo` (código que não é material da odontologia).
* `motivo` e `observacao` só são preenchidos em `descontinuado`. Os motivos estão na lista abaixo.
* `fator` divide a quantidade da BRANET para chegar à unidade do catálogo. O sacolé sai da BRANET por unidade e o catálogo conta em pacote com 100: fator 100.

`marcacoes.csv`: `codigo_catalogo`, `mes`, `tipo`, `observacao`, `marcado_em`, `marcado_por`.

* `tipo` é `falta` (mês sem saída por falta de estoque), `atipico_maior` (saída acima do normal: pedido administrativo, remanejamento por validade, campanha), `atipico_menor` (saída abaixo do normal: racionamento, falta parcial) ou vazio.
* `observacao` é opcional. Linha com tipo vazio é só uma observação sobre o mês; linha com `mes` vazio é uma observação geral do material.
* Na página: clicar num mês sem saída marca ou desmarca falta, sem perguntar; clicar num mês com saída abre a escolha entre atípica maior e menor. As observações aparecem nas **Notas** do material, recolhidas, com data e autor. Marca sem observação não vira nota.

`descontinuados.csv`: `codigo_catalogo`, `material`, `motivo`, `observacao`, `decidido_em`, `decidido_por`.

* Uma linha por material. Reativar o material na página apaga a linha.

Motivos de descontinuado (os mesmos nos dois arquivos): `substituido` (substituído por outro material), `sem_uso` (deixou de ser usado: mudança de técnica ou protocolo), `baixa_saida` (pouca ou nenhuma saída), `fora_de_linha` (saiu de linha no mercado), `qualidade` (problema de qualidade ou segurança) e `outro` (outro motivo; a observação é obrigatória).

## Descontinuados

* **Código solto da BRANET** (aba Unir códigos, botão **Descontinuado**): o código sai da lista para revisar e das contas, e não volta nas próximas importações. As saídas continuam no `saidas.csv`, porque o próximo relatório as traria de volta; a marca é que faz a página ignorá-las.
* **Material do catálogo** (aba Materiais, no detalhe do material, **Marcar como descontinuado**): a situação vira Descontinuado e a sugestão, Fora do próximo pregão. O material sai do ABC × XYZ (não tira posição dos outros da família) e da lista de candidatos a entrar no pregão. Se estiver num pregão, aparece como Descontinuado, com necessidade zero. O histórico de saída e o gráfico continuam à vista.
* Nos dois casos, o catálogo (`produtos.csv`) não muda. Para tirar o material do catálogo, use o Editor.

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

O documento com a explicação completa, os exemplos e as referências é o **Cálculo da Análise de Consumo**.
