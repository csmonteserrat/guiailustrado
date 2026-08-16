/* =================================================================
   CATÁLOGO ILUSTRADO DE MATERIAIS ODONTOLÓGICOS — PMF
   Site estático, sem framework e sem backend.
   Todo o conteúdo vem do arquivo produtos.csv.
   ================================================================= */

/* -----------------------------------------------------------------
   1. AJUSTES RÁPIDOS
   Versão do site, mostrada no rodapé, no mesmo padrão das páginas
   administrativas: ano-mês-dia e uma letra para cada entrega do dia.
   Atualize a cada revisão.
   ----------------------------------------------------------------- */
const VERSAO_SITE = '2026-08-16c';

/* Data mostrada no cabeçalho das impressões. Não é a data da versão do
   site, e sim a da última vez que a lista de materiais mudou de fato.
   Ela é lida do histórico do editor, e só na hora de imprimir: assim
   quem apenas consulta o catálogo não baixa o arquivo de histórico.
   Sessões que mexeram somente em descritivos não contam, porque não
   alteram nada do que sai impresso. */
let DATA_CATALOGO = '';
let dataCatalogoBuscada = false;

async function carregarDataDoCatalogo() {
  if (dataCatalogoBuscada) return DATA_CATALOGO;
  dataCatalogoBuscada = true;
  try {
    const r = await fetch('editor-catalogo/historico.md?t=' + Date.now());
    if (!r.ok) return DATA_CATALOGO;
    const texto = await r.text();
    const re = /<!--\s*sessao:(\{[\s\S]*?\})\s*-->/g;
    let m, maisRecente = null;
    while ((m = re.exec(texto)) !== null) {
      let s;
      try { s = JSON.parse(m[1]); } catch (e) { continue; }
      if (!s || !s.data) continue;
      const mexeuNaLista = (s.alteracoes || []).some(a => a.tipo !== 'descritivo');
      if (!mexeuNaLista) continue;
      if (!maisRecente || String(s.data) > String(maisRecente)) maisRecente = s.data;
    }
    if (maisRecente) {
      const d = new Date(maisRecente);
      if (!isNaN(d)) {
        const p = n => String(n).padStart(2, '0');
        DATA_CATALOGO = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
      }
    }
  } catch (e) {
    /* Sem histórico legível, a linha da data não é impressa. */
  }
  return DATA_CATALOGO;
}

/* Textos dos avisos. Podem ser editados livremente. */
const TEXTOS = {
  faixaCEO:
    'Os materiais desta seção pertencem à lista dos Centros de Especialidades Odontológicas, ' +
    'e as solicitações são feitas pelas equipes do CEO. Eles ficam disponíveis aqui para consulta ' +
    'e referência de toda a rede.',
  faixaCoord:
    'Estes materiais constam da lista da Enfermagem, e não da lista da Odontologia. Por isso não ' +
    'aparecem no pedido do CELK feito pelo cirurgião-dentista. Para obtê-los, converse com o ' +
    'coordenador da sua unidade de saúde, que faz a requisição pela lista dele.',
  coordVazio:
    'Esta seção está em construção. Em breve serão listados aqui os materiais da lista da ' +
    'Enfermagem que interessam à odontologia.',
  avisoFotos:
    'As fotos são meramente ilustrativas. Elas mostram o tipo de material correspondente ao código, ' +
    'mas a marca, o modelo, a cor e a apresentação do produto efetivamente entregue à unidade podem ' +
    'ser diferentes, já que dependem do resultado de cada processo de compra. Sempre confirme o ' +
    'código e a descrição do item, que são as informações que valem para o pedido.',
  rodapeCurto: 'Fotos ilustrativas. Marca e apresentação podem variar conforme a compra vigente.',
  cardCoord: 'Solicite ao coordenador da sua unidade',
  tituloCatalogo: 'Catálogo ilustrado de materiais odontológicos',
  gt: 'GT Padronização de Materiais, Insumos e Equipamentos'
};

/* Nomes dos blocos, definidos pela coluna "acesso" do CSV. */
const BLOCOS = {
  TODOS: { chave: 'basica', titulo: 'Rede básica', selo: 'Rede básica', classe: 'basica' },
  CEO: { chave: 'ceo', titulo: 'Exclusivo CEO', selo: 'CEO', classe: 'ceo' },
  COORDENACAO: { chave: 'coord', titulo: 'Interesse odontológico', selo: 'Coordenação', classe: 'coord' }
};

const CHAVES = {
  perfil: 'pmf.catalogo.perfil',
  vista: 'pmf.catalogo.vista',
  tema: 'pmf.catalogo.tema',
  lista: 'pmf.catalogo.lista',
  verCEO: 'pmf.catalogo.verCEO',
  grupos: 'pmf.catalogo.grupos'
};

/* -----------------------------------------------------------------
   2. ESTADO
   ----------------------------------------------------------------- */
const estado = {
  itens: [],
  perfil: null,          // 'BASICA' ou 'CEO' (local de trabalho)
  aba: 'tudo',
  busca: '',
  tipos: new Set(),
  especialidades: new Set(),
  familias: new Set(),
  buscaFamilia: '',
  gruposAbertos: { especialidade: true, familia: false },
  vista: 'grade',
  verCEO: false,         // no perfil rede básica, mostrar também o bloco do CEO
  lista: {}              // { codigo: quantidade }
};

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

function guardar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
}
function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : JSON.parse(v);
  } catch (e) { return padrao; }
}

/* -----------------------------------------------------------------
   3. UTILITÁRIOS
   ----------------------------------------------------------------- */

/* Remove acentos e coloca em minúsculas, para a busca ser tolerante. */
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

function escapar(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Leitor de CSV: aceita vírgula ou ponto e vírgula, respeita aspas
   e quebras de linha dentro do campo, e remove o BOM do UTF-8. */
function lerCSV(texto) {
  texto = texto.replace(/^\uFEFF/, '');
  const primeiraLinha = texto.slice(0, texto.indexOf('\n') === -1 ? texto.length : texto.indexOf('\n'));
  const sep = (primeiraLinha.split(';').length > primeiraLinha.split(',').length) ? ';' : ',';

  const linhas = [];
  let campo = '', linha = [], dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroDeAspas = false;
      } else campo += c;
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === sep) {
      linha.push(campo); campo = '';
    } else if (c === '\n') {
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else if (c !== '\r') {
      campo += c;
    }
  }
  if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }

  const cabecalho = (linhas.shift() || []).map(h => h.trim().toLowerCase());
  return linhas
    .filter(l => l.some(c => c.trim() !== ''))
    .map(l => {
      const obj = {};
      cabecalho.forEach((h, i) => { obj[h] = (l[i] || '').trim(); });
      return obj;
    });
}

function prepararItens(linhas) {
  return linhas
    .filter(l => (l.ativo || '').toUpperCase() !== 'NAO')
    .map(l => {
      const acesso = (l.acesso || 'TODOS').toUpperCase();
      const especialidades = (l.especialidade || '')
        .split(';').map(s => s.trim()).filter(Boolean);
      return {
        codigo: l.codigo || '',
        material: l.material || '',
        unidade: l.unidade || '',
        grupo: l.grupo || '',
        subgrupo: l.subgrupo || '',
        acesso: BLOCOS[acesso] ? acesso : 'TODOS',
        tipo: l.tipo || '',
        especialidades,
        familias: (l.familia || '').split(';').map(s => s.trim()).filter(Boolean),
        imagem: l.imagem || (l.codigo ? l.codigo + '.jpg' : ''),
        observacao: l.observacao || '',
        indice: normalizar([l.codigo, l.material, l.familia, l.especialidade, l.subgrupo].join(' ').replace(/;/g, ' '))
      };
    })
    /* Ordem alfabética pelo nome do material, independente da ordem em
       que as linhas estão no CSV. Assim um item novo entra no lugar
       certo da tela, e não no fim da página.
       "numeric" faz Nº 2 vir antes de Nº 10, e não depois;
       "sensitivity: base" ignora acentos e maiúsculas, para ÁCIDO ficar
       junto de ACIDO. */
    .sort((a, b) => a.material.localeCompare(b.material, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

/* -----------------------------------------------------------------
   4. FILTRAGEM
   ----------------------------------------------------------------- */
/* "ignorar" permite contar quantos itens cada opção traria sem que ela
   própria entre na conta, que é o número mostrado ao lado de cada filtro. */
function passaNosFiltros(item, ignorar) {
  if (estado.tipos.size && !estado.tipos.has(item.tipo)) return false;

  if (ignorar !== 'familia' && estado.familias.size) {
    const alguma = item.familias.some(f => estado.familias.has(f));
    if (!alguma) return false;
  }

  if (ignorar !== 'especialidade' && estado.especialidades.size) {
    const algum = item.especialidades.some(e => estado.especialidades.has(e));
    if (!algum) return false;
  }

  if (estado.busca) {
    const termos = normalizar(estado.busca).split(/\s+/).filter(Boolean);
    if (!termos.every(t => item.indice.includes(t))) return false;
  }
  return true;
}

/* Blocos visíveis conforme a aba escolhida e o perfil de trabalho. */
function blocosVisiveis() {
  if (estado.aba === 'TODOS') return ['TODOS'];
  if (estado.aba === 'CEO') return ['CEO'];
  if (estado.aba === 'COORDENACAO') return ['COORDENACAO'];
  const lista = ['TODOS'];
  if (estado.perfil === 'CEO' || estado.verCEO) lista.push('CEO');
  lista.push('COORDENACAO');
  return lista;
}

function agrupar(itens) {
  const g = { TODOS: [], CEO: [], COORDENACAO: [] };
  itens.forEach(i => g[i.acesso].push(i));
  return g;
}

/* -----------------------------------------------------------------
   5. DESENHO DA TELA
   ----------------------------------------------------------------- */

function molduraFoto(item, classe) {
  const alt = escapar(item.material);
  const src = 'imagens/' + escapar(item.imagem);
  return `<div class="moldura ${classe || ''}">
      <img src="${src}" alt="${alt}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.hidden=false;">
      <div class="sem-foto" hidden>
        <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>
        <span>Foto ainda não cadastrada</span>
      </div>
    </div>`;
}

function selosDoItem(item) {
  const b = BLOCOS[item.acesso];
  let html = `<span class="selo selo--${b.classe}">${escapar(b.selo)}</span>`;
  if (item.subgrupo) html += `<span class="selo selo--neutro">${escapar(item.subgrupo)}</span>`;
  return html;
}

function etiquetas(item) {
  let html = '';
  item.familias.forEach(f => {
    html += `<button type="button" class="etiqueta etiqueta--familia" data-familia="${escapar(f)}"
      title="Ver todos os itens de ${escapar(f)}">${escapar(f)}</button>`;
  });
  item.especialidades.forEach(e => {
    html += `<button type="button" class="etiqueta" data-especialidade="${escapar(e)}">${escapar(e)}</button>`;
  });
  return html;
}

function cardHTML(item) {
  const b = BLOCOS[item.acesso];
  const naLista = estado.lista[item.codigo] ? ' na-lista' : '';
  return `<article class="card card--${b.classe}" data-codigo="${escapar(item.codigo)}">
    <button type="button" class="card-foto" data-abrir="${escapar(item.codigo)}" aria-label="Ampliar foto de ${escapar(item.material)}">
      <span class="card-selo-foto selo selo--${b.classe}">${escapar(b.selo)}</span>
      ${molduraFoto(item)}
    </button>
    <div class="card-corpo">
      <div class="card-selos">${item.subgrupo ? `<span class="selo selo--neutro">${escapar(item.subgrupo)}</span>` : ''}</div>
      <h3 class="card-nome"><button type="button" data-abrir="${escapar(item.codigo)}">${escapar(item.material)}</button></h3>
      <div class="linha-codigo">
        <span class="codigo">${escapar(item.codigo)}</span>
        <span class="unidade">${escapar(item.unidade)}</span>
      </div>
      ${item.acesso === 'COORDENACAO' ? `<p class="nota-coord">${TEXTOS.cardCoord}</p>` : ''}
      ${item.observacao ? `<p class="observacao">${escapar(item.observacao)}</p>` : ''}
      <div class="card-etiquetas">${etiquetas(item)}</div>
    </div>
    <div class="card-acoes">
      <button type="button" class="btn-copiar" data-copiar="${escapar(item.codigo)}">
        <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>
        <span class="rotulo">Copiar código</span>
      </button>
      <button type="button" class="btn-adicionar${naLista}" data-adicionar="${escapar(item.codigo)}"
        aria-label="Adicionar ${escapar(item.material)} à lista de pedido" title="Adicionar à lista">
        <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
  </article>`;
}

function linhaHTML(item) {
  const b = BLOCOS[item.acesso];
  const naLista = estado.lista[item.codigo] ? ' na-lista' : '';
  return `<article class="linha-item linha-item--${b.classe}" data-codigo="${escapar(item.codigo)}">
    <button type="button" class="linha-foto" data-abrir="${escapar(item.codigo)}" aria-label="Ampliar foto de ${escapar(item.material)}">
      ${molduraFoto(item)}
    </button>
    <div class="linha-dados">
      <span class="linha-nome">${escapar(item.material)}</span>
      <div class="linha-meta">
        <span class="codigo">${escapar(item.codigo)}</span>
        <span class="unidade">${escapar(item.unidade)}</span>
        <span class="selo selo--${b.classe}">${escapar(b.selo)}</span>
        ${item.familias.map(f => `<button type="button" class="etiqueta etiqueta--familia" data-familia="${escapar(f)}">${escapar(f)}</button>`).join('')}
      </div>
    </div>
    <div class="linha-acoes">
      <button type="button" class="btn-copiar" data-copiar="${escapar(item.codigo)}" title="Copiar código" aria-label="Copiar código ${escapar(item.codigo)}">
        <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>
        <span class="rotulo">Copiar código</span>
      </button>
      <button type="button" class="btn-adicionar${naLista}" data-adicionar="${escapar(item.codigo)}"
        aria-label="Adicionar ${escapar(item.material)} à lista de pedido" title="Adicionar à lista">
        <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
  </article>`;
}

function listagemHTML(itens) {
  if (estado.vista === 'lista') {
    return `<div class="lista-compacta">${itens.map(linhaHTML).join('')}</div>`;
  }
  return `<div class="grade">${itens.map(cardHTML).join('')}</div>`;
}

const ICONE_INFO = `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/></svg>`;

function secaoHTML(chaveAcesso, itens, totalNoBloco) {
  const b = BLOCOS[chaveAcesso];
  let faixa = '';
  if (chaveAcesso === 'CEO') faixa = `<div class="faixa-aviso faixa-aviso--ceo">${ICONE_INFO}<p>${TEXTOS.faixaCEO}</p></div>`;
  if (chaveAcesso === 'COORDENACAO') faixa = `<div class="faixa-aviso faixa-aviso--coord">${ICONE_INFO}<p>${TEXTOS.faixaCoord}</p></div>`;

  let miolo;
  if (!itens.length) {
    if (chaveAcesso === 'COORDENACAO' && !totalNoBloco) {
      miolo = `<div class="estado-vazio"><h3>Seção em construção</h3><p>${TEXTOS.coordVazio}</p></div>`;
    } else {
      miolo = `<div class="estado-vazio"><p>Nenhum item deste bloco corresponde à busca atual.</p></div>`;
    }
  } else {
    miolo = listagemHTML(itens);
  }

  return `<section class="secao secao--${b.classe}">
    <h2 class="secao-titulo">${escapar(b.titulo)}
      <span class="secao-contagem">${itens.length} ${itens.length === 1 ? 'item' : 'itens'}</span>
    </h2>
    ${faixa}
    ${miolo}
  </section>`;
}

function desenhar() {
  const visiveis = blocosVisiveis();
  const filtrados = estado.itens.filter(i => passaNosFiltros(i, false));
  const grupos = agrupar(filtrados);
  const todosDoBloco = agrupar(estado.itens);

  let html = '';
  let contagem = 0;

  visiveis.forEach(chave => {
    contagem += grupos[chave].length;
    html += secaoHTML(chave, grupos[chave], todosDoBloco[chave].length);
  });

  /* Perfil rede básica: convite explícito para ver os itens do CEO,
     que ficam separados visualmente, nunca escondidos de fato. */
  if (estado.aba === 'tudo' && estado.perfil === 'BASICA' && !estado.verCEO) {
    const qtd = grupos.CEO.length;
    const chamada = `<div class="secao"><div class="chamada-ceo">
      <p>Existem <strong>${qtd}</strong> ${qtd === 1 ? 'material' : 'materiais'} da lista dos Centros de
      Especialidades Odontológicas ${estado.busca || temFiltro() ? 'que correspondem a esta busca' : 'no catálogo'}.
      Eles ficam separados aqui para consulta e referência de toda a rede.</p>
      <button type="button" class="btn-solido" id="btn-ver-ceo">Ver também os materiais exclusivos do CEO</button>
    </div></div>`;
    /* insere a chamada logo depois da seção da rede básica */
    const marcador = '<section class="secao secao--coord">';
    html = html.includes(marcador) ? html.replace(marcador, chamada + marcador) : html + chamada;
  }

  /* A aba de interesse odontológico mantém sempre o texto explicativo
     enquanto a lista da Enfermagem ainda não tiver itens no CSV. */
  const abaEmConstrucao = estado.aba === 'COORDENACAO' && !todosDoBloco.COORDENACAO.length;

  if (!contagem && (estado.busca || temFiltro()) && !abaEmConstrucao) {
    html = `<div class="estado-vazio">
      <h3>Nenhum material encontrado</h3>
      <p>Tente parte do nome do material, como <em>broca</em>, ou digite o código do item.
      Também é possível que os filtros aplicados estejam estreitando demais o resultado.</p>
      <button type="button" class="btn-solido" id="btn-limpar-tudo">Limpar busca e filtros</button>
    </div>`;
  }

  $('#secoes').innerHTML = html;
  $('#contador').textContent = contagem + (contagem === 1 ? ' item encontrado' : ' itens encontrados');

  desenharFiltrosLaterais(visiveis);
  desenharFichas();
  atualizarContagemPedido();
}

function temFiltro() {
  return estado.tipos.size || estado.especialidades.size || estado.familias.size;
}

/* Uma opção da barra lateral, seja de especialidade ou de família. */
function opcaoHTML(nome, contagem, ativa, atributo) {
  return `<button type="button" class="item-opcao" data-${atributo}="${escapar(nome)}" aria-pressed="${ativa}">
    <span class="item-opcao-nome">${escapar(nome)}</span><span class="contagem">${contagem}</span>
  </button>`;
}

/* Conta quantos itens cada opção traria, sem que o próprio grupo entre
   na conta. Assim o número ao lado nunca fica zerado sem motivo. */
function contar(visiveis, ignorar, pegarValores) {
  const contagens = new Map();
  estado.itens.forEach(item => {
    if (!visiveis.includes(item.acesso)) return;
    if (!passaNosFiltros(item, ignorar)) return;
    pegarValores(item).forEach(v => { if (v) contagens.set(v, (contagens.get(v) || 0) + 1); });
  });
  return contagens;
}

function desenharFiltrosLaterais(visiveis) {
  const emOrdem = mapa => Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  /* --- especialidade --- */
  const porEspecialidade = contar(visiveis, 'especialidade', i => i.especialidades);
  $('#lista-especialidades').innerHTML =
    emOrdem(porEspecialidade).map(e =>
      opcaoHTML(e, porEspecialidade.get(e), estado.especialidades.has(e), 'especialidade')
    ).join('') || '<p class="aviso-lista">Nenhuma especialidade no resultado atual.</p>';

  /* --- família --- */
  const porFamilia = contar(visiveis, 'familia', i => i.familias);
  const busca = normalizar(estado.buscaFamilia);
  const familias = emOrdem(porFamilia).filter(f => !busca || normalizar(f).includes(busca));

  $('#lista-familias').innerHTML =
    familias.map(f => opcaoHTML(f, porFamilia.get(f), estado.familias.has(f), 'familia')).join('') ||
    `<p class="aviso-lista">${busca ? 'Nenhuma família com esse nome.' : 'Nenhuma família no resultado atual.'}</p>`;

  /* --- estado dos grupos e do botão de limpar --- */
  aplicarGrupo('especialidade');
  aplicarGrupo('familia');

  const total = estado.tipos.size + estado.especialidades.size + estado.familias.size;
  $('#limpar-filtros-lateral').hidden = !total;
  const marcador = $('#contagem-filtros');
  marcador.textContent = total;
  marcador.hidden = !total;
}

function aplicarGrupo(nome) {
  const aberto = estado.gruposAbertos[nome];
  $(`[data-grupo="${nome}"]`).setAttribute('aria-expanded', String(aberto));
  $('#grupo-' + nome).hidden = !aberto;
}

function desenharFichas() {
  const fichas = [];
  const ficha = (rotulo, tipo, valor) =>
    `<button type="button" class="ficha" data-remover-filtro="${tipo}" data-valor="${escapar(valor)}">
      ${escapar(rotulo)}<span class="x" aria-hidden="true">×</span>
      <span class="sr-only"> (remover filtro)</span>
    </button>`;

  estado.tipos.forEach(t => fichas.push(ficha(t, 'tipo', t)));
  estado.especialidades.forEach(e => fichas.push(ficha(e, 'especialidade', e)));
  estado.familias.forEach(f => fichas.push(ficha(f, 'familia', f)));

  if (fichas.length > 1) {
    fichas.push('<button type="button" class="ficha ficha-limpar" id="ficha-limpar">Limpar filtros</button>');
  }
  $('#fichas-ativas').innerHTML = fichas.join('');
}

/* -----------------------------------------------------------------
   6. MODAL DO PRODUTO
   ----------------------------------------------------------------- */
let ultimoFoco = null;

function abrirModal(codigo) {
  const item = estado.itens.find(i => i.codigo === codigo);
  if (!item) return;
  const b = BLOCOS[item.acesso];
  ultimoFoco = document.activeElement;

  $('#modal-conteudo').innerHTML = `
    <div class="modal-foto">${molduraFoto(item)}</div>
    <div class="modal-info">
      <div class="card-selos">${selosDoItem(item)}</div>
      <h2 id="modal-nome">${escapar(item.material)}</h2>
      <dl class="modal-dados">
        <dt>Código</dt><dd><span class="codigo">${escapar(item.codigo)}</span></dd>
        <dt>Unidade de pedido</dt><dd>${escapar(item.unidade)}</dd>
        <dt>Grupo</dt><dd>${escapar(item.grupo || '—')}</dd>
        <dt>Subgrupo</dt><dd>${escapar(item.subgrupo)}</dd>
        <dt>Tipo</dt><dd>${escapar(item.tipo)}</dd>
      </dl>
      <div class="card-etiquetas">${etiquetas(item)}</div>
      ${item.acesso === 'COORDENACAO' ? `<p class="nota-coord">${TEXTOS.cardCoord}</p>` : ''}
      ${item.observacao ? `<p class="observacao">${escapar(item.observacao)}</p>` : ''}
      <div class="modal-acoes">
        <button type="button" class="btn-solido" data-copiar="${escapar(item.codigo)}">Copiar código</button>
        <button type="button" class="btn-contorno" data-adicionar="${escapar(item.codigo)}">Adicionar à lista</button>
      </div>
      <p class="aviso-fotos-modal">${TEXTOS.avisoFotos}</p>
    </div>`;
  $('#modal-produto').hidden = false;
  $('#fechar-modal').focus();
}

function fecharModal() {
  $('#modal-produto').hidden = true;
  if (ultimoFoco) ultimoFoco.focus();
}

/* -----------------------------------------------------------------
   7. LISTA DE PEDIDO
   ----------------------------------------------------------------- */
function itensDaLista() {
  return Object.keys(estado.lista)
    .map(c => estado.itens.find(i => i.codigo === c))
    .filter(Boolean);
}

function adicionarNaLista(codigo) {
  estado.lista[codigo] = (estado.lista[codigo] || 0) + 1;
  guardar(CHAVES.lista, estado.lista);
  atualizarContagemPedido();
  desenharPedido();
  $$(`[data-adicionar="${CSS.escape(codigo)}"]`).forEach(b => b.classList.add('na-lista'));
  mostrarAviso('Adicionado à lista');
}

function definirQuantidade(codigo, qtd) {
  qtd = Math.max(1, Math.min(999, parseInt(qtd, 10) || 1));
  estado.lista[codigo] = qtd;
  guardar(CHAVES.lista, estado.lista);
  desenharPedido();
}

function removerDaLista(codigo) {
  delete estado.lista[codigo];
  guardar(CHAVES.lista, estado.lista);
  atualizarContagemPedido();
  desenharPedido();
  $$(`[data-adicionar="${CSS.escape(codigo)}"]`).forEach(b => b.classList.remove('na-lista'));
}

function atualizarContagemPedido() {
  $('#fab-contagem').textContent = Object.keys(estado.lista).length;
}

function blocoPedido(titulo, itens, aviso) {
  if (!itens.length) return '';
  return `<h3 class="pedido-grupo-titulo">${titulo}</h3>
    ${aviso || ''}
    ${itens.map(item => `
      <div class="pedido-item">
        ${molduraFoto(item)}
        <div class="pedido-item-dados">
          <div class="pedido-item-nome">${escapar(item.material)}</div>
          <div class="linha-meta">
            <span class="codigo">${escapar(item.codigo)}</span>
            <span class="unidade">${escapar(item.unidade)}</span>
            ${item.acesso !== 'TODOS' ? `<span class="selo selo--${BLOCOS[item.acesso].classe}">${BLOCOS[item.acesso].selo}</span>` : ''}
          </div>
        </div>
        <div class="controle-qtd">
          <button type="button" data-qtd="menos" data-codigo="${escapar(item.codigo)}" aria-label="Diminuir quantidade">−</button>
          <input type="number" min="1" max="999" value="${estado.lista[item.codigo]}" data-codigo="${escapar(item.codigo)}"
                 aria-label="Quantidade de ${escapar(item.material)}">
          <button type="button" data-qtd="mais" data-codigo="${escapar(item.codigo)}" aria-label="Aumentar quantidade">+</button>
        </div>
        <button type="button" class="btn-remover" data-remover="${escapar(item.codigo)}" aria-label="Remover ${escapar(item.material)} da lista">
          <svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>`).join('')}`;
}

function desenharPedido() {
  const itens = itensDaLista();
  const corpo = $('#corpo-pedido');

  if (!itens.length) {
    corpo.innerHTML = `<div class="estado-vazio">
      <h3>A lista está vazia</h3>
      <p>Use o botão <strong>+</strong> em qualquer material para montar aqui um rascunho de conferência
      antes de lançar o pedido no CELK.</p></div>`;
    return;
  }

  const celk = itens.filter(i => i.acesso !== 'COORDENACAO');
  const coord = itens.filter(i => i.acesso === 'COORDENACAO');
  const temCEO = celk.some(i => i.acesso === 'CEO');

  const avisoCEO = temCEO
    ? `<div class="faixa-aviso faixa-aviso--ceo">${ICONE_INFO}<p>Há itens dos grupos 14 e 15 nesta lista.
       Eles são de solicitação exclusiva das equipes do CEO.</p></div>` : '';
  const avisoCoord = coord.length
    ? `<div class="faixa-aviso faixa-aviso--coord">${ICONE_INFO}<p>Estes itens não entram no pedido do CELK.
       Informe o código ao coordenador da sua unidade, que faz a requisição pela lista da Enfermagem.</p></div>` : '';

  corpo.innerHTML =
    blocoPedido('Para lançar no CELK', celk, avisoCEO) +
    blocoPedido('Para solicitar ao coordenador', coord, avisoCoord);
}

function textoDaLista() {
  const itens = itensDaLista();
  const linha = i => `${i.codigo} — ${i.material} — ${i.unidade} — Qtd: ${estado.lista[i.codigo]}`;
  const celk = itens.filter(i => i.acesso !== 'COORDENACAO');
  const coord = itens.filter(i => i.acesso === 'COORDENACAO');
  let txt = `${TEXTOS.tituloCatalogo}\nLista de conferência — ${new Date().toLocaleDateString('pt-BR')}\n`;
  if (celk.length) txt += `\nPARA LANÇAR NO CELK\n` + celk.map(linha).join('\n') + '\n';
  if (coord.length) txt += `\nPARA SOLICITAR AO COORDENADOR DA UNIDADE\n` + coord.map(linha).join('\n') + '\n';
  if (celk.some(i => i.acesso === 'CEO')) {
    txt += `\nObservação: itens marcados como grupos 14 e 15 são de solicitação exclusiva do CEO.\n`;
  }
  return txt;
}

function baixarCSVdaLista() {
  const itens = itensDaLista();
  if (!itens.length) { mostrarAviso('A lista está vazia'); return; }
  const cabecalho = 'codigo;material;unidade;quantidade;bloco';
  const linhas = itens.map(i =>
    [i.codigo, '"' + i.material.replace(/"/g, '""') + '"', i.unidade, estado.lista[i.codigo], BLOCOS[i.acesso].titulo].join(';'));
  const conteudo = '\uFEFF' + [cabecalho].concat(linhas).join('\r\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lista-de-pedido.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* -----------------------------------------------------------------
   8. COPIAR E AVISOS
   ----------------------------------------------------------------- */
function copiar(texto) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(texto).catch(() => copiaAntiga(texto));
  }
  return Promise.resolve(copiaAntiga(texto));
}
function copiaAntiga(texto) {
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* ignora */ }
  document.body.removeChild(ta);
}

let temporizadorAviso = null;
function mostrarAviso(texto) {
  const el = $('#aviso-copiado');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 1800);
}

/* -----------------------------------------------------------------
   9. IMPRESSÃO
   ----------------------------------------------------------------- */
function itensParaImpressao(modo) {
  if (modo === 'completo') return estado.itens.slice();
  if (modo === 'tela') {
    const visiveis = blocosVisiveis();
    return estado.itens.filter(i => visiveis.includes(i.acesso) && passaNosFiltros(i, false));
  }
  return itensDaLista();
}

function cabecalhoImpressao(subtitulo) {
  return `<div class="imp-cabecalho">
    <div class="imp-titulo">${TEXTOS.tituloCatalogo}</div>
    <div class="imp-linha">${TEXTOS.gt}</div>
    <div class="imp-linha">${DATA_CATALOGO ? 'Última atualização: ' + DATA_CATALOGO : ''}${
      DATA_CATALOGO && subtitulo ? ' · ' : ''}${subtitulo ? escapar(subtitulo) : ''}</div>
  </div>`;
}

function marcaImpressa(item) {
  if (item.acesso === 'CEO') return '<span class="imp-marca">CEO</span>';
  if (item.acesso === 'COORDENACAO') return '<span class="imp-marca">COORDENADOR</span>';
  return '';
}

function itemImpressoHTML(item) {
  return `<div class="imp-item">
    <div class="imp-foto">
      <img src="imagens/${escapar(item.imagem)}" alt="" onerror="this.style.display='none';this.nextElementSibling.hidden=false;">
      <span class="imp-sem-foto" hidden>sem foto</span>
    </div>
    <div class="imp-codigo">${escapar(item.codigo)} ${marcaImpressa(item)}</div>
    <div class="imp-nome">${escapar(item.material)}</div>
    <div class="imp-unidade">${escapar(item.unidade)}</div>
  </div>`;
}

/* Cada bloco de itens vira uma tabela: o cabeçalho fica no <thead>,
   e assim o navegador o repete no topo de todas as páginas. */
function tabelaImpressa(titulo, itens) {
  let linhas = '';
  for (let i = 0; i < itens.length; i += 3) {
    linhas += '<tr>' + [0, 1, 2].map(j => {
      const item = itens[i + j];
      return `<td class="imp-cel">${item ? itemImpressoHTML(item) : ''}</td>`;
    }).join('') + '</tr>';
  }
  return `<table class="imp-tabela imp-secao">
    <thead>
      <tr><th colspan="3">${cabecalhoImpressao('')}</th></tr>
      <tr><th colspan="3"><div class="imp-secao-titulo">${escapar(titulo)} — ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}</div></th></tr>
    </thead>
    <tfoot><tr><td colspan="3"><div class="imp-rodape">${TEXTOS.rodapeCurto}</div></td></tr></tfoot>
    <tbody>${linhas}</tbody>
  </table>`;
}

function montarImpressao(modo) {
  const itens = itensParaImpressao(modo);
  const area = $('#area-impressao');

  if (modo === 'lista') {
    const linhas = itens.map(i => `<tr>
      <td class="col-cod">${escapar(i.codigo)} ${marcaImpressa(i)}</td>
      <td>${escapar(i.material)}</td>
      <td>${escapar(i.unidade)}</td>
      <td class="col-qtd">${estado.lista[i.codigo]}</td></tr>`).join('');
    area.innerHTML = `<table class="imp-lista imp-secao">
      <thead>
        <tr><th colspan="4">${cabecalhoImpressao('Lista de pedido')}</th></tr>
        <tr><th>Código</th><th>Material</th><th>Unidade</th><th class="col-qtd">Qtd.</th></tr>
      </thead>
      <tfoot><tr><td colspan="4"><div class="imp-rodape">${TEXTOS.rodapeCurto}</div></td></tr></tfoot>
      <tbody>${linhas}</tbody></table>`;
    return itens.length;
  }

  /* Agrupa por subgrupo, cada grupo começando em página nova. */
  const ordem = [];
  const porSubgrupo = new Map();
  itens.forEach(i => {
    const chave = i.subgrupo || 'Sem subgrupo';
    if (!porSubgrupo.has(chave)) { porSubgrupo.set(chave, []); ordem.push(chave); }
    porSubgrupo.get(chave).push(i);
  });
  area.innerHTML = ordem.map(s => tabelaImpressa(s, porSubgrupo.get(s))).join('');
  return itens.length;
}

async function prepararImpressao(modo) {
  await carregarDataDoCatalogo();
  const total = montarImpressao(modo);
  if (!total) {
    mostrarAviso(modo === 'lista' ? 'A lista está vazia' : 'Não há itens para imprimir');
    return;
  }
  const porPagina = modo === 'lista' ? 24 : 12;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const palavraItem = total === 1 ? 'item' : 'itens';
  const palavraPagina = paginas === 1 ? 'página' : 'páginas';
  $('#impressao-resumo').innerHTML =
    'Serão impressos <strong>' + total + '</strong> ' + palavraItem +
    ', o que deve ocupar cerca de <strong>' + paginas + '</strong> ' + palavraPagina + '.';
  $('#modal-impressao').hidden = false;
  $('#confirmar-impressao').focus();
}

/* -----------------------------------------------------------------
   10. PERFIL, TEMA E VISTA
   ----------------------------------------------------------------- */
function aplicarPerfil(perfil) {
  estado.perfil = perfil;
  estado.verCEO = perfil === 'CEO' ? true : ler(CHAVES.verCEO, false);
  document.body.dataset.perfil = perfil;
  $('#rotulo-perfil').textContent = perfil === 'CEO' ? 'Centro de Especialidades' : 'Centro de Saúde';
  guardar(CHAVES.perfil, perfil);
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  guardar(CHAVES.tema, tema);
}

function aplicarVista(vista) {
  estado.vista = vista;
  guardar(CHAVES.vista, vista);
  $$('.btn-vista').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === vista)));
}

function mostrarCatalogo() {
  $('#tela-entrada').hidden = true;
  $('#app').hidden = false;
  medirCabecalho();
  desenhar();
  /* Foco automático na busca apenas no computador, para não abrir o
     teclado sozinho no celular. */
  if (window.matchMedia('(min-width: 1024px)').matches) $('#busca').focus();
}

function mostrarEntrada() {
  $('#app').hidden = true;
  $('#tela-entrada').hidden = false;
}

function medirCabecalho() {
  const h = $('.cabecalho').offsetHeight;
  document.documentElement.style.setProperty('--altura-cabecalho', (h + 16) + 'px');
}

/* -----------------------------------------------------------------
   11. EVENTOS
   ----------------------------------------------------------------- */
function ligarEventos() {

  /* --- tela de entrada --- */
  $$('.cartao-perfil').forEach(b => b.addEventListener('click', () => {
    aplicarPerfil(b.dataset.perfil);
    mostrarCatalogo();
  }));

  /* --- perfil --- */
  $('#btn-perfil').addEventListener('click', () => {
    /* Troca de local de trabalho em um clique, sem apagar a lista. */
    aplicarPerfil(estado.perfil === 'CEO' ? 'BASICA' : 'CEO');
    desenhar();
    mostrarAviso(estado.perfil === 'CEO' ? 'Local: Centro de Especialidades' : 'Local: Centro de Saúde');
  });

  /* --- tema --- */
  $('#btn-tema').addEventListener('click', () => {
    aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro');
  });

  /* --- vista --- */
  $$('.btn-vista').forEach(b => b.addEventListener('click', () => { aplicarVista(b.dataset.vista); desenhar(); }));

  /* --- busca --- */
  const busca = $('#busca');
  busca.addEventListener('input', () => {
    estado.busca = busca.value;
    $('#btn-limpar-busca').hidden = !busca.value;
    desenhar();
  });
  $('#btn-limpar-busca').addEventListener('click', () => {
    busca.value = ''; estado.busca = ''; $('#btn-limpar-busca').hidden = true; busca.focus(); desenhar();
  });

  /* --- abas --- */
  $$('.aba').forEach(b => b.addEventListener('click', () => {
    estado.aba = b.dataset.aba;
    $$('.aba').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    desenhar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  /* --- filtros de tipo --- */
  $('#faixa-filtros').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.tipo) return;
    estado.tipos.has(btn.dataset.tipo) ? estado.tipos.delete(btn.dataset.tipo) : estado.tipos.add(btn.dataset.tipo);
    btn.setAttribute('aria-pressed', String(estado.tipos.has(btn.dataset.tipo)));
    desenhar();
  });

  /* --- barra lateral de filtros --- */
  $('#lateral').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.grupo) {
      const g = btn.dataset.grupo;
      estado.gruposAbertos[g] = !estado.gruposAbertos[g];
      guardar(CHAVES.grupos, estado.gruposAbertos);
      aplicarGrupo(g);
      if (estado.gruposAbertos.familia && g === 'familia') $('#busca-familia').focus();
      return;
    }
    if (btn.id === 'limpar-filtros-lateral') { limparFiltros(); desenhar(); return; }
    if (btn.id === 'fechar-filtros') { fecharFiltros(); return; }
    if (btn.dataset.especialidade) { alternarEspecialidade(btn.dataset.especialidade); desenhar(); return; }
    if (btn.dataset.familia) { alternarFamilia(btn.dataset.familia); desenhar(); return; }
  });

  /* A busca de família filtra só a lista de opções, não o catálogo. */
  $('#busca-familia').addEventListener('input', e => {
    estado.buscaFamilia = e.target.value;
    desenhar();
  });

  /* --- painel de filtros no celular --- */
  $('#btn-filtros').addEventListener('click', abrirFiltros);
  $('#fundo-filtros').addEventListener('click', fecharFiltros);

  /* --- fichas de filtro ativo --- */
  $('#fichas-ativas').addEventListener('click', e => {
    if (e.target.closest('#ficha-limpar')) { limparFiltros(); desenhar(); return; }
    const btn = e.target.closest('[data-remover-filtro]');
    if (!btn) return;
    const { removerFiltro, valor } = btn.dataset;
    if (removerFiltro === 'tipo') {
      estado.tipos.delete(valor);
      $$('[data-tipo]').forEach(p => p.setAttribute('aria-pressed', String(estado.tipos.has(p.dataset.tipo))));
    }
    if (removerFiltro === 'especialidade') estado.especialidades.delete(valor);
    if (removerFiltro === 'familia') estado.familias.delete(valor);
    desenhar();
  });

  /* --- cliques dentro da listagem --- */
  $('#secoes').addEventListener('click', e => {
    const alvo = e.target.closest('button');
    if (!alvo) return;

    if (alvo.id === 'btn-ver-ceo') {
      estado.verCEO = true; guardar(CHAVES.verCEO, true); desenhar(); return;
    }
    if (alvo.id === 'btn-limpar-tudo') {
      $('#busca').value = ''; estado.busca = ''; $('#btn-limpar-busca').hidden = true;
      limparFiltros(); desenhar(); return;
    }
    if (alvo.dataset.familia) {
      alternarFamilia(alvo.dataset.familia);
      desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (alvo.dataset.especialidade) { alternarEspecialidade(alvo.dataset.especialidade); desenhar(); return; }
    if (alvo.dataset.abrir) { abrirModal(alvo.dataset.abrir); return; }
    if (alvo.dataset.copiar) { acaoCopiar(alvo, alvo.dataset.copiar); return; }
    if (alvo.dataset.adicionar) { adicionarNaLista(alvo.dataset.adicionar); return; }
  });

  /* --- modal do produto --- */
  $('#fechar-modal').addEventListener('click', fecharModal);
  $('#modal-produto').addEventListener('click', e => {
    if (e.target.id === 'modal-produto') { fecharModal(); return; }
    const alvo = e.target.closest('button');
    if (!alvo) return;
    if (alvo.dataset.copiar) acaoCopiar(alvo, alvo.dataset.copiar);
    if (alvo.dataset.adicionar) adicionarNaLista(alvo.dataset.adicionar);
    /* Clicar numa etiqueta dentro do modal filtra o catálogo e fecha o modal. */
    if (alvo.dataset.familia) {
      alternarFamilia(alvo.dataset.familia);
      fecharModal(); desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (alvo.dataset.especialidade) {
      alternarEspecialidade(alvo.dataset.especialidade);
      fecharModal(); desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* --- painel do pedido --- */
  $('#btn-pedido').addEventListener('click', abrirPedido);
  $('#fechar-pedido').addEventListener('click', fecharPedido);
  $('#fundo-pedido').addEventListener('click', fecharPedido);

  $('#corpo-pedido').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.remover) removerDaLista(btn.dataset.remover);
    if (btn.dataset.qtd) {
      const c = btn.dataset.codigo;
      definirQuantidade(c, estado.lista[c] + (btn.dataset.qtd === 'mais' ? 1 : -1));
    }
  });
  $('#corpo-pedido').addEventListener('change', e => {
    if (e.target.matches('input[type="number"]')) definirQuantidade(e.target.dataset.codigo, e.target.value);
  });

  $('#btn-copiar-lista').addEventListener('click', () => {
    if (!Object.keys(estado.lista).length) { mostrarAviso('A lista está vazia'); return; }
    copiar(textoDaLista()).then(() => mostrarAviso('Lista copiada'));
  });
  $('#btn-baixar-lista').addEventListener('click', baixarCSVdaLista);
  $('#btn-limpar-lista').addEventListener('click', () => {
    if (!Object.keys(estado.lista).length) return;
    if (confirm('Apagar todos os itens da lista de pedido?')) {
      estado.lista = {};
      guardar(CHAVES.lista, estado.lista);
      atualizarContagemPedido(); desenharPedido(); desenhar();
      mostrarAviso('Lista apagada');
    }
  });

  /* --- impressão --- */
  const menu = $('#menu-imprimir');
  $('#btn-imprimir').addEventListener('click', e => {
    e.stopPropagation();
    const abrindo = menu.hidden;
    menu.hidden = !abrindo;
    $('#btn-imprimir').setAttribute('aria-expanded', String(abrindo));
  });
  document.addEventListener('click', () => {
    if (!menu.hidden) { menu.hidden = true; $('#btn-imprimir').setAttribute('aria-expanded', 'false'); }
  });
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-imprimir]');
    if (!b) return;
    menu.hidden = true;
    prepararImpressao(b.dataset.imprimir);
  });
  $('#cancelar-impressao').addEventListener('click', () => { $('#modal-impressao').hidden = true; });
  $('#confirmar-impressao').addEventListener('click', () => {
    $('#modal-impressao').hidden = true;
    setTimeout(() => window.print(), 120);
  });

  /* --- teclado --- */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#modal-produto').hidden) fecharModal();
    else if (!$('#modal-impressao').hidden) $('#modal-impressao').hidden = true;
    else if (!$('#painel-pedido').hidden) fecharPedido();
    else if (!$('#tela-guia').hidden) $('#tela-guia').hidden = true;
    else if (document.body.classList.contains('filtros-abertos')) fecharFiltros();
    else if (!menu.hidden) menu.hidden = true;
  });

  window.addEventListener('resize', medirCabecalho);
}

function acaoCopiar(botao, codigo) {
  copiar(codigo).then(() => {
    mostrarAviso('Código ' + codigo + ' copiado');
    const rotulo = botao.querySelector('.rotulo');
    botao.classList.add('copiado');
    if (rotulo) { rotulo.dataset.antes = rotulo.textContent; rotulo.textContent = 'Copiado'; }
    setTimeout(() => {
      botao.classList.remove('copiado');
      if (rotulo && rotulo.dataset.antes) rotulo.textContent = rotulo.dataset.antes;
    }, 1500);
  });
}

function alternarEspecialidade(e) {
  estado.especialidades.has(e) ? estado.especialidades.delete(e) : estado.especialidades.add(e);
}

function alternarFamilia(f) {
  estado.familias.has(f) ? estado.familias.delete(f) : estado.familias.add(f);
}

function limparFiltros() {
  estado.tipos.clear();
  estado.especialidades.clear();
  estado.familias.clear();
  $$('[data-tipo]').forEach(p => p.setAttribute('aria-pressed', 'false'));
}

function abrirFiltros() {
  document.body.classList.add('filtros-abertos');
  $('#fundo-filtros').hidden = false;
  $('#fechar-filtros').focus();
}
function fecharFiltros() {
  document.body.classList.remove('filtros-abertos');
  $('#fundo-filtros').hidden = true;
}

function abrirPedido() {
  desenharPedido();
  $('#painel-pedido').hidden = false;
  $('#fundo-pedido').hidden = false;
  $('#fechar-pedido').focus();
}
function fecharPedido() {
  $('#painel-pedido').hidden = true;
  $('#fundo-pedido').hidden = true;
}

/* -----------------------------------------------------------------
   12. PARTIDA
   ----------------------------------------------------------------- */
function iniciar() {
  $('#rodape-data').textContent = VERSAO_SITE;

  /* Tema: respeita a preferência do sistema na primeira visita,
     mas a escolha manual guardada tem prioridade. */
  const temaSalvo = ler(CHAVES.tema, null);
  const escuroNoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(temaSalvo || (escuroNoSistema ? 'escuro' : 'claro'));

  aplicarVista(ler(CHAVES.vista, 'grade'));
  estado.lista = ler(CHAVES.lista, {}) || {};
  estado.verCEO = ler(CHAVES.verCEO, false);
  estado.gruposAbertos = Object.assign({ especialidade: true, familia: false }, ler(CHAVES.grupos, {}));

  fetch('produtos.csv', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(texto => {
      estado.itens = prepararItens(lerCSV(texto));
      atualizarContagemPedido();
      ligarEventos();

      const perfilSalvo = ler(CHAVES.perfil, null);
      if (perfilSalvo === 'BASICA' || perfilSalvo === 'CEO') {
        aplicarPerfil(perfilSalvo);
        mostrarCatalogo();
      } else {
        aplicarPerfil('BASICA');
        document.body.dataset.perfil = 'BASICA';
        mostrarEntrada();
        /* O botão do guia da tela de entrada não escolhe perfil nenhum. */
      }
    })
    .catch(erro => {
      $('#tela-entrada').hidden = true;
      $('#app').hidden = true;
      $('#aviso-arquivo-local').hidden = false;
      $('#aviso-arquivo-detalhe').textContent =
        (location.protocol === 'file:'
          ? 'Endereço atual: file:// (arquivo local)'
          : 'Não foi possível ler produtos.csv') + ' · ' + erro.message;
    });
}

/* Na tela de entrada o botão do guia precisa funcionar mesmo antes de
   o catálogo carregar, por isso ele também é ligado aqui. */
document.addEventListener('DOMContentLoaded', () => {
  $$('[data-abrir-guia]').forEach(b => b.addEventListener('click', () => { $('#tela-guia').hidden = false; }));
  $('[data-fechar-guia]').addEventListener('click', () => { $('#tela-guia').hidden = true; });
  iniciar();
});
