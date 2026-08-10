#!/usr/bin/env python3
"""
PREPARAR IMAGENS DO CATÁLOGO
============================

O que este script faz:
  1. Pega todas as fotos de uma pasta de entrada
  2. Recorta em quadrado, redimensiona para 800x800 e coloca fundo branco
  3. Salva em JPG otimizado na pasta /imagens, com o nome do código
  4. Avisa quais códigos do produtos.csv ainda estão sem foto

COMO USAR (macOS)
-----------------
1. Instale a biblioteca de imagens, uma vez só. No Terminal:
       pip3 install Pillow

2. Deixe a estrutura assim:
       catalogo-odonto/
         produtos.csv
         imagens/            (as fotos prontas vão para cá)
         fotos-brutas/       (coloque aqui as fotos recém tiradas)
         preparar-imagens.py

3. Nomeie cada foto bruta com o código do produto: 4150488.jpg
   Aceita .jpg .jpeg .png .heic .webp e não diferencia maiúsculas.

4. No Terminal, dentro da pasta catalogo-odonto:
       python3 preparar-imagens.py

5. Para apenas conferir o que falta, sem processar nada:
       python3 preparar-imagens.py --conferir
"""

import csv
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Falta instalar a biblioteca. Rode no Terminal:  pip3 install Pillow")

BASE = Path(__file__).parent
ENTRADA = BASE / "fotos-brutas"
SAIDA = BASE / "imagens"
CSV = BASE / "produtos.csv"

TAMANHO = 800          # lado do quadrado final, em pixels
QUALIDADE = 88         # qualidade do JPG: 88 equilibra nitidez e tamanho de arquivo
MARGEM = 0.04          # respiro branco ao redor do produto, 4% de cada lado
MINIMO_ACEITAVEL = 400 # abaixo disso a foto fica borrada ao ampliar no modal
APARAR_FUNDO = True    # remove a moldura vazia ao redor do produto, padronizando o enquadramento
EXTENSOES = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".tif", ".tiff", ".bmp"}


def carregar_produtos():
    if not CSV.exists():
        sys.exit(f"Não encontrei o arquivo {CSV.name} nesta pasta.")
    with open(CSV, encoding="utf-8-sig") as f:
        return [linha for linha in csv.DictReader(f) if linha.get("ativo", "SIM").upper() == "SIM"]


def sobre_fundo_branco(img):
    """Converte para RGB colocando o que for transparente sobre branco.

    Sem isso, um PNG com fundo transparente baixado da internet vira
    um retângulo preto ao ser salvo em JPG.
    """
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
        fundo = Image.new("RGBA", img.size, (255, 255, 255, 255))
        img = Image.alpha_composite(fundo, img)
    return img.convert("RGB")


def aparar(img, tolerancia=18):
    """Corta a borda uniforme e clara ao redor do produto.

    Imagens de sites de fornecedores vêm com quantidades muito diferentes
    de espaço vazio. Aparar e recompor com margem fixa faz com que todos
    os produtos apareçam do mesmo tamanho na grade do catálogo.
    """
    cinza = img.convert("L")
    mascara = cinza.point(lambda v: 255 if v < 255 - tolerancia else 0)
    caixa = mascara.getbbox()
    if not caixa:
        return img
    largura, altura = img.size
    # Segurança: se o corte for exagerado, provavelmente a foto tem fundo escuro
    if (caixa[2] - caixa[0]) < largura * 0.15 or (caixa[3] - caixa[1]) < altura * 0.15:
        return img
    return img.crop(caixa)


def preparar(origem: Path, destino: Path):
    """Normaliza qualquer imagem em um quadrado de 800x800 com fundo branco."""
    img = Image.open(origem)
    img = ImageOps.exif_transpose(img)          # corrige fotos de celular deitadas
    img = sobre_fundo_branco(img)

    aviso = None
    if min(img.size) < MINIMO_ACEITAVEL:
        aviso = f"resolução baixa ({img.width}x{img.height})"

    if APARAR_FUNDO:
        img = aparar(img)

    lado_util = int(TAMANHO * (1 - 2 * MARGEM))
    img.thumbnail((lado_util, lado_util), Image.LANCZOS)

    fundo = Image.new("RGB", (TAMANHO, TAMANHO), "white")
    fundo.paste(img, ((TAMANHO - img.width) // 2, (TAMANHO - img.height) // 2))
    fundo.save(destino, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)
    return aviso


def main():
    produtos = carregar_produtos()
    codigos = {p["codigo"].strip(): p for p in produtos}
    SAIDA.mkdir(exist_ok=True)

    conferir = "--conferir" in sys.argv

    if not conferir:
        if not ENTRADA.exists():
            ENTRADA.mkdir()
            print(f"Criei a pasta {ENTRADA.name}. Coloque as fotos lá e rode de novo.")
            return

        processadas, desconhecidas, fracas = 0, [], []
        for arquivo in sorted(ENTRADA.iterdir()):
            if arquivo.suffix.lower() not in EXTENSOES:
                continue
            codigo = arquivo.stem.strip()
            if codigo not in codigos:
                desconhecidas.append(arquivo.name)
                continue
            try:
                aviso = preparar(arquivo, SAIDA / f"{codigo}.jpg")
                processadas += 1
                if aviso:
                    fracas.append(f"{codigo}: {aviso}")
            except Exception as erro:
                print(f"  erro em {arquivo.name}: {erro}")

        print(f"\n{processadas} foto(s) preparada(s) em {TAMANHO}x{TAMANHO} na pasta imagens/")
        if fracas:
            print(f"\n{len(fracas)} imagem(ns) com resolução baixa, vale procurar uma versão maior:")
            for nome in fracas[:15]:
                print("   ", nome)
        if desconhecidas:
            print(f"\n{len(desconhecidas)} arquivo(s) com nome que não corresponde a nenhum código ativo:")
            for nome in desconhecidas[:15]:
                print("   ", nome)
            if len(desconhecidas) > 15:
                print(f"    e mais {len(desconhecidas) - 15}")

    # Relatório do que ainda falta
    existentes = {p.stem for p in SAIDA.glob("*.jpg")}
    faltam = [p for c, p in codigos.items() if c not in existentes]
    total = len(codigos)
    print(f"\nSituação do catálogo: {total - len(faltam)} de {total} itens com foto "
          f"({(total - len(faltam)) * 100 // total}%)")

    if faltam:
        por_familia = {}
        for p in faltam:
            por_familia.setdefault(p.get("familia", "Sem família"), []).append(p)
        print(f"\nFaltam {len(faltam)} fotos, agrupadas por família:")
        for familia, itens in sorted(por_familia.items(), key=lambda x: -len(x[1])):
            print(f"  {len(itens):>3}  {familia}")

        destino = BASE / "fotos-faltantes.csv"
        with open(destino, "w", newline="", encoding="utf-8-sig") as f:
            campos = ["familia", "especialidade", "subgrupo", "codigo", "material", "unidade"]
            w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
            w.writeheader()
            w.writerows(sorted(faltam, key=lambda p: (p.get("familia", ""), p["material"])))
        print(f"\nLista de trabalho salva em {destino.name}, ordenada por família, "
              f"pronta para imprimir e levar para a sessão de fotos.")


if __name__ == "__main__":
    main()
