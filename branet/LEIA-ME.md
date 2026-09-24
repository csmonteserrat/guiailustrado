# BRANET

Esta pasta guarda como cada material do catálogo está cadastrado na BRANET, a central terceirizada que guarda os materiais.

| Arquivo | Para que serve |
|---|---|
| `branet.csv` | Os códigos e o nome de cada material na BRANET. |
| `LEIA-ME.md` | Este arquivo. |

## O que tem no arquivo

O catálogo usa o código e o nome do CELK, que é o que o dentista vê para pedir. Na BRANET, o mesmo material tem códigos próprios, sem relação com o do CELK, e um nome que às vezes é igual ao do catálogo e às vezes não.

Colunas, nesta ordem:

`codigo`, `branet_codigo`, `branet_codigo_cliente`, `branet_nome`, `modificado_em`, `modificado_por`

* **codigo**: o código do CELK. É ele que liga a linha ao material do `produtos.csv`.
* **branet_codigo** e **branet_codigo_cliente**: os dois códigos da BRANET. Às vezes só um deles existe.
* **branet_nome**: o nome na BRANET. Fica em branco quando é igual ao nome do catálogo.
* **modificado_em** e **modificado_por**: preenchidos pelo editor ao salvar, e só quando algum dos três campos acima muda.

Só entram no arquivo os materiais que têm pelo menos um desses três campos preenchido. Vale para todos os materiais, inclusive os da lista da Enfermagem.

Formato igual ao dos outros arquivos de dados: separado por vírgula, UTF-8 com BOM, fim de linha CRLF.

## Onde aparece

* No **editor do catálogo**, no cartão **Almoxarifado BRANET**, abaixo do descritivo. É lá que os dados são preenchidos.
* Na página de **descritivos**, logo abaixo do texto de cada descritivo.

O catálogo dos dentistas não lê este arquivo.

## Quando o código do CELK muda

Um material criado com código provisório (9000001 em diante) ganha o código real do CELK quando é comprado. Ao trocar o código pelo editor, os dados da BRANET acompanham o material sozinhos. Se o arquivo for editado à mão, troque também o `codigo` da linha aqui.
