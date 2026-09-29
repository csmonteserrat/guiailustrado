/* =====================================================================
   MOTOR DE PUBLICAÇÃO
   Envia arquivos ao repositório pela API de conteúdo do GitHub, para
   substituir o ciclo de baixar o pacote, descompactar e reenviar à mão.

   Este arquivo não tem interface: ele é usado pelas ferramentas do
   painel. O download do pacote .zip continua existindo em todas elas e
   nunca depende deste arquivo, para o caso de a rede bloquear o GitHub.

   Cuidados que estão embutidos aqui e não devem ser desfeitos:

   - A chave fica só no localStorage do navegador. Nunca em arquivo.
   - O texto é convertido em bytes por TextEncoder antes do base64.
     btoa direto sobre a string quebra em qualquer acento, e o catálogo
     é todo acentuado.
   - O BOM do UTF-8 é preservado na leitura e na escrita. O TextDecoder
     apaga o BOM por padrão, por isso a leitura usa ignoreBOM.
   - Antes de enviar, calcula-se o hash do arquivo no mesmo formato que
     o GitHub usa (SHA-1 de blob do git). Depois do envio, compara-se
     com o hash devolvido. É a conferência de que o que foi gravado é
     byte a byte o que saiu daqui.
   ===================================================================== */
(function(global){
'use strict';

/* Onde o catálogo mora. Se o repositório for transferido para uma
   organização, basta trocar o dono aqui. */
var CFG={dono:'csmonteserrat',nome:'guiailustrado',ramo:'main',
         caminhoHistorico:'editor-catalogo/historico.md',
         /* Quantas sessões cabem em cada arquivo do histórico. Quando o
            historico.md passa disso, as 100 mais antigas vão para um
            arquivo fechado (historico-001.md, historico-002.md...) na
            mesma pasta, e o historico.md recomeça com as mais novas. */
         limiteHistorico:100};

var API='https://api.github.com';
var CHAVE_TOKEN='gh-token';
var CHAVE_AUTOR='editor-autor';

/* ---------------------------------------------------------------------
   Chave e identificação
   --------------------------------------------------------------------- */
function token(){try{return localStorage.getItem(CHAVE_TOKEN)||''}catch(e){return ''}}
function temChave(){return !!token()}
function autor(){try{return localStorage.getItem(CHAVE_AUTOR)||''}catch(e){return ''}}

function cabecalhos(extra){
  var h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  var t=token();
  if(t)h['Authorization']='Bearer '+t;
  if(extra)for(var k in extra)h[k]=extra[k];
  return h;
}

function enderecoConteudo(caminho){
  return API+'/repos/'+CFG.dono+'/'+CFG.nome+'/contents/'+
         caminho.split('/').map(encodeURIComponent).join('/');
}

/* ---------------------------------------------------------------------
   Erros com tipo, para que cada tela escolha o que dizer ao usuário.
   tipo: sem-chave | rede | autenticacao | permissao | conflito |
         limite | github | conferencia
   --------------------------------------------------------------------- */
function erro(tipo,mensagem,status){
  var e=new Error(mensagem);
  e.tipo=tipo;
  e.status=status||0;
  return e;
}

async function requisitar(endereco,opcoes){
  var r;
  try{
    r=await fetch(endereco,opcoes);
  }catch(e){
    throw erro('rede','Não consegui falar com o GitHub. Isso costuma ser bloqueio da rede ou '+
                      'falta de conexão. O pacote .zip continua disponível.');
  }
  return r;
}

/* Traduz as respostas ruins que valem tratamento próprio. */
function conferirResposta(r){
  if(r.status===401)
    throw erro('autenticacao','A chave de publicação não foi aceita. Ela pode ter vencido ou '+
                              'sido cancelada. Cadastre uma chave nova no painel.',401);
  if(r.status===403||r.status===429){
    if(r.headers.get('x-ratelimit-remaining')==='0')
      throw erro('limite','O limite de consultas ao GitHub foi atingido. Espere alguns minutos '+
                          'e tente de novo.',r.status);
    throw erro('permissao','A chave não tem permissão para gravar neste repositório. Confira, no '+
                           'painel, se ela foi criada com Contents: Read and write.',r.status);
  }
  if(r.status===409||r.status===422)
    throw erro('conflito','O arquivo mudou no repositório depois que você começou a editar.',r.status);
}

/* ---------------------------------------------------------------------
   Conversões
   --------------------------------------------------------------------- */
function bytesDeTexto(texto){return new TextEncoder().encode(texto)}

/* ignoreBOM mantém o BOM no texto. Sem isso o BOM seria apagado na
   leitura e o arquivo voltaria ao repositório sem ele. Os leitores de
   CSV do projeto já removem o ﻿ por conta própria. */
function textoDeBytes(bytes){return new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes)}

function bytesDeBase64(b64){
  var bin=atob((b64||'').replace(/\s/g,''));
  var out=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}

/* Em blocos, porque String.fromCharCode com um arquivo inteiro de uma
   vez estoura a pilha do navegador em imagens grandes. */
function base64DeBytes(bytes){
  var bin='',passo=0x8000;
  for(var i=0;i<bytes.length;i+=passo)
    bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+passo));
  return btoa(bin);
}

/* Hash idêntico ao que o GitHub devolve no campo sha de um arquivo:
   SHA-1 de "blob <tamanho>\0" seguido do conteúdo.
   Devolve null quando o navegador não oferece crypto.subtle, o que
   acontece ao abrir a página direto do disco. Nesse caso a publicação
   segue, apenas sem a conferência. */
async function hashGit(bytes){
  if(!(global.crypto&&global.crypto.subtle&&global.crypto.subtle.digest))return null;
  var cab=bytesDeTexto('blob '+bytes.length+String.fromCharCode(0));
  var junto=new Uint8Array(cab.length+bytes.length);
  junto.set(cab,0);
  junto.set(bytes,cab.length);
  var d=await global.crypto.subtle.digest('SHA-1',junto);
  return Array.prototype.map.call(new Uint8Array(d),function(b){
    return ('0'+b.toString(16)).slice(-2);
  }).join('');
}

/* ---------------------------------------------------------------------
   Leitura
   --------------------------------------------------------------------- */

/* Situação de um arquivo no repositório, sem baixar o conteúdo.
   Arquivo inexistente devolve existe:false, e não erro: é o caso normal
   de uma foto nova. */
async function situacao(caminho){
  var r=await requisitar(enderecoConteudo(caminho)+'?ref='+encodeURIComponent(CFG.ramo),
                         {headers:cabecalhos(),cache:'no-store'});
  if(r.status===404)return {caminho:caminho,existe:false,sha:null,tamanho:0};
  conferirResposta(r);
  if(!r.ok)throw erro('github','O GitHub respondeu com o erro '+r.status+'.',r.status);
  var j=await r.json();
  return {caminho:caminho,existe:true,sha:j.sha,tamanho:j.size,_json:j};
}

/* Conteúdo em bytes, mais o sha atual.
   Arquivos acima de 1 MB não vêm no corpo da resposta de conteúdo, e
   por isso são buscados na forma bruta, pelo mesmo endereço. */
async function obter(caminho){
  var s=await situacao(caminho);
  if(!s.existe)return {caminho:caminho,existe:false,sha:null,bytes:new Uint8Array(0)};
  var j=s._json;
  if(j.content&&j.encoding==='base64')
    return {caminho:caminho,existe:true,sha:j.sha,tamanho:j.size,bytes:bytesDeBase64(j.content)};

  var r=await requisitar(enderecoConteudo(caminho)+'?ref='+encodeURIComponent(CFG.ramo),
        {headers:cabecalhos({'Accept':'application/vnd.github.raw'}),cache:'no-store'});
  conferirResposta(r);
  if(!r.ok)throw erro('github','Não consegui ler '+caminho+' (erro '+r.status+').',r.status);
  var buf=await r.arrayBuffer();
  return {caminho:caminho,existe:true,sha:j.sha,tamanho:j.size,bytes:new Uint8Array(buf)};
}

async function obterTexto(caminho){
  var o=await obter(caminho);
  o.texto=o.existe?textoDeBytes(o.bytes):'';
  return o;
}

/* Quem publicou por último e quando. Usado para dizer o nome certo na
   tela de conflito, em vez de estimar. */
async function ultimoCommit(caminho){
  var e=API+'/repos/'+CFG.dono+'/'+CFG.nome+'/commits?per_page=1&sha='+
        encodeURIComponent(CFG.ramo)+
        (caminho?'&path='+encodeURIComponent(caminho):'');
  var r=await requisitar(e,{headers:cabecalhos(),cache:'no-store'});
  if(!r.ok)return null;
  var j=await r.json();
  if(!j||!j.length)return null;
  var c=j[0];
  var quando=c.commit&&c.commit.author?new Date(c.commit.author.date):null;
  return {
    sha:c.sha,
    conta:c.author?c.author.login:null,
    nome:(c.commit&&c.commit.author&&c.commit.author.name)||(c.author&&c.author.login)||'alguém',
    data:quando,
    quando:quando?tempoRelativo(quando):'',
    mensagem:(c.commit&&c.commit.message)||''
  };
}

/* ---------------------------------------------------------------------
   Escrita
   --------------------------------------------------------------------- */

/* Envia um arquivo.
   op = {caminho, texto | bytes, sha, mensagem}
   O sha é o do arquivo que serviu de base. Sem ele, o GitHub entende
   que é um arquivo novo e recusa se já existir.

   Devolve {sha, commit, conferido}. conferido é true quando o hash
   calculado aqui bate com o devolvido pelo GitHub, false quando não
   bate e null quando não foi possível calcular. */
async function enviar(op){
  if(!temChave())
    throw erro('sem-chave','Nenhuma chave de publicação está cadastrada neste navegador. '+
                           'Cadastre no painel de administração, ou use o pacote .zip.');
  if(!op||!op.caminho)throw erro('github','Faltou dizer qual arquivo enviar.');

  var bytes=op.bytes||bytesDeTexto(op.texto||'');
  var esperado=await hashGit(bytes);

  var corpo={message:op.mensagem||('Atualiza '+op.caminho),
             content:base64DeBytes(bytes),
             branch:CFG.ramo};
  if(op.sha)corpo.sha=op.sha;

  var r=await requisitar(enderecoConteudo(op.caminho),{
    method:'PUT',
    headers:cabecalhos({'Content-Type':'application/json'}),
    body:JSON.stringify(corpo)
  });
  conferirResposta(r);
  if(!r.ok)throw erro('github','O GitHub recusou o envio de '+op.caminho+' (erro '+r.status+').',r.status);

  var j=await r.json();
  var gravado=j.content?j.content.sha:null;
  return {
    caminho:op.caminho,
    sha:gravado,
    commit:j.commit?j.commit.sha:null,
    conferido:(esperado&&gravado)?(esperado===gravado):null,
    esperado:esperado
  };
}

/* Remove um arquivo do repositório.
   op = {caminho, sha, mensagem}
   O sha é o do arquivo tal como está no repositório agora: sem ele, ou
   com um sha velho, o GitHub recusa por segurança (alguém pode ter
   trocado o arquivo entre a leitura e o clique em excluir).

   A exclusão fica registrada como um commit comum: o arquivo some do
   repositório, mas a versão anterior continua no histórico de commits
   do GitHub, recuperável por quem tiver acesso lá, mesmo sem "desfazer"
   dentro das ferramentas do catálogo. */
async function excluir(op){
  if(!temChave())
    throw erro('sem-chave','Nenhuma chave de publicação está cadastrada neste navegador. '+
                           'Cadastre no painel de administração.');
  if(!op||!op.caminho)throw erro('github','Faltou dizer qual arquivo excluir.');
  if(!op.sha)throw erro('github','Faltou o sha do arquivo a excluir.');

  var corpo={message:op.mensagem||('Remove '+op.caminho),sha:op.sha,branch:CFG.ramo};

  var r=await requisitar(enderecoConteudo(op.caminho),{
    method:'DELETE',
    headers:cabecalhos({'Content-Type':'application/json'}),
    body:JSON.stringify(corpo)
  });
  conferirResposta(r);
  if(!r.ok)throw erro('github','O GitHub recusou a exclusão de '+op.caminho+' (erro '+r.status+').',r.status);

  var j=await r.json();
  return {caminho:op.caminho,commit:j.commit?j.commit.sha:null};
}

/* ---------------------------------------------------------------------
   Apoio
   --------------------------------------------------------------------- */

/* "há poucos minutos" evita fingir precisão que não interessa a
   ninguém e que soa estranha numa tela de conflito. */
function tempoRelativo(data){
  var s=(Date.now()-data.getTime())/1000;
  if(s<0)return 'agora';
  if(s<120)return 'há poucos minutos';
  if(s<3600)return 'há '+Math.round(s/60)+' minutos';
  if(s<86400){var h=Math.round(s/3600);return 'há '+h+(h===1?' hora':' horas')}
  var d=Math.round(s/86400);
  if(d===1)return 'ontem';
  if(d<30)return 'há '+d+' dias';
  return 'em '+data.toLocaleDateString('pt-BR');
}

/* Mensagem de commit legível no histórico do GitHub.
   Ex.: Editor: atualiza produtos.csv (3 itens) */
function mensagem(origem,caminho,quantos,singular,plural){
  var m=origem+': atualiza '+caminho;
  if(quantos){
    var s=singular||'item';
    var p=plural||(s==='item'?'itens':s+'s');
    m+=' ('+quantos+' '+(quantos===1?s:p)+')';
  }
  return m;
}

function tamanhoLegivel(n){
  if(n<1024)return n+' B';
  if(n<1048576)return (n/1024).toFixed(1).replace('.',',')+' KB';
  return (n/1048576).toFixed(1).replace('.',',')+' MB';
}

function configurar(novo){
  if(novo&&novo.dono)CFG.dono=novo.dono;
  if(novo&&novo.nome)CFG.nome=novo.nome;
  if(novo&&novo.ramo)CFG.ramo=novo.ramo;
}

/* =====================================================================
   HISTÓRICO
   ---------------------------------------------------------------------
   Ler, juntar e escrever o editor-catalogo/historico.md. Estava só
   dentro do editor; passou para cá quando o preparador de imagens
   também precisou registrar o que publica. Uma implementação só evita
   que os dois gravem o arquivo em formatos diferentes.

   O arquivo tem duas camadas: o texto em markdown, legível no GitHub, e
   um comentário HTML ao fim de cada sessão com os dados exatos, que é o
   que as páginas leem de volta.

   Divisão em arquivos (desde 29/09/2026): cada arquivo guarda no máximo
   CFG.limiteHistorico sessões. O historico.md é sempre o arquivo aberto,
   o único que recebe sessões novas. Quando ele passaria do limite, as
   sessões mais antigas saem em blocos fechados de 100, nos arquivos
   editor-catalogo/historico-001.md (sessões 1 a 100), historico-002.md
   (101 a 200) e assim por diante. Esses arquivos nunca mais mudam.
   O historico.md guarda, num comentário "volumes", quantas sessões já
   foram para os arquivos fechados, quais são eles e a data da última
   sessão arquivada. A numeração das sessões continua corrida entre os
   arquivos, e a data serve para que uma sessão já arquivada não volte a
   entrar no historico.md numa publicação feita por uma tela aberta há
   muito tempo.
   ===================================================================== */
var TIPOS_HIST={novo:'novo',editado:'editado',inativado:'inativado',reativado:'reativado',
                excluido:'excluído',descritivo:'descritivo',branet:'BRANET',imagem:'foto'};
var ROTULOS_HIST={codigo:'Código',material:'Material',unidade:'Unidade de pedido',grupo:'Grupo',
  subgrupo:'Subgrupo',acesso:'Acesso',tipo:'Tipo',especialidade:'Tags',familia:'Família',
  nome_descritivo:'Nome no descritivo',nome_pregao:'Nome no descritivo',descritivo:'Descritivo',
  unidade_compra:'Unidade de compra',situacao_compra:'Situação da compra',
  branet_codigo:'Código na BRANET',branet_codigo_cliente:'Código cliente na BRANET',branet_nome:'Nome na BRANET',
  imagem:'Arquivo da imagem',observacao:'Observação',
  ativo:'Situação',foto:'Foto'};
function rotuloHist(c){return ROTULOS_HIST[c]||c}
function nomeTipo(t){return TIPOS_HIST[t]||t}

function dataLegivelHist(iso){
  try{return new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
  catch(e){return iso}
}

function lerHistorico(texto){
  var blocos=[],re=/<!--\s*sessao:(\{[\s\S]*?\})\s*-->/g,m;
  while((m=re.exec(texto||''))!==null){
    try{blocos.push(JSON.parse(m[1]))}catch(e){}
  }
  blocos.sort(function(a,b){return String(a.data||'').localeCompare(String(b.data||''))});
  return blocos;
}

/* Dados da divisão em arquivos, lidos do historico.md. Um arquivo antigo,
   sem o comentário, é tratado como o único que existe. */
function metaHistorico(texto){
  var m=/<!--\s*volumes:(\{[\s\S]*?\})\s*-->/.exec(texto||'');
  var v={anteriores:0,arquivos:[],ate:''};
  if(m){
    try{
      var j=JSON.parse(m[1]);
      v.anteriores=+j.anteriores||0;
      v.arquivos=Array.isArray(j.arquivos)?j.arquivos.slice():[];
      v.ate=j.ate||'';
    }catch(e){}
  }
  return v;
}

function nomeVolume(n){return 'historico-'+('00'+n).slice(-3)+'.md'}

/* Pasta dos arquivos do histórico, a mesma do historico.md. */
function pastaHistorico(){return CFG.caminhoHistorico.replace(/[^\/]*$/,'')}

function blocoHistorico(s,numero){
  var L=[];
  L.push('## '+dataLegivelHist(s.data)+(s.autor?' — '+s.autor:''));
  L.push('');
  L.push('Sessão '+numero+' · '+(s.alteracoes||[]).length+' alteração(ões)'+
         (s.total?' · '+s.total+' itens no arquivo após a edição':''));
  L.push('');
  if(s.origem){L.push('**Origem:** '+s.origem+'.');L.push('')}
  if(!s.alteracoes||!s.alteracoes.length){
    L.push('_Nenhuma alteração registrada nesta sessão._');
  }else{
    var cont={};
    s.alteracoes.forEach(function(a){cont[a.tipo]=(cont[a.tipo]||0)+1});
    L.push('**Resumo:** '+Object.keys(cont).map(function(t){return cont[t]+' '+nomeTipo(t)}).join(' · '));
    L.push('');
    s.alteracoes.forEach(function(a){
      L.push('- **['+nomeTipo(a.tipo).toUpperCase()+']** `'+a.codigo+'` '+(a.material||''));
      if(a.resumo)L.push('    - '+a.resumo);
      if(a.campos&&a.campos.length)
        a.campos.forEach(function(c){
          L.push('    - '+rotuloHist(c.campo)+': "'+(c.de||'')+'" → "'+(c.para||'')+'"')});
      else if(a.dados)
        Object.keys(a.dados).forEach(function(c){L.push('    - '+rotuloHist(c)+': '+a.dados[c])});
    });
  }
  L.push('');
  L.push('<!-- sessao:'+JSON.stringify(s)+' -->');
  L.push('');
  return L.join('\n');
}

/* Texto do historico.md, o arquivo aberto. todas = só as sessões que
   ficam nele, da mais antiga para a mais nova; meta = a divisão em
   arquivos (sem ela, é o único arquivo). */
function gerarHistorico(todas,meta){
  meta=meta||{anteriores:0,arquivos:[],ate:''};
  var base=meta.anteriores||0,total=base+todas.length;
  var L=[];
  L.push('# Histórico de alterações do catálogo');
  L.push('');
  L.push('Registro automático das edições feitas no `produtos.csv` pelo editor do catálogo.');
  L.push('As sessões aparecem da mais recente para a mais antiga.');
  L.push('Não edite este arquivo à mão: ele é lido e reescrito pelo editor.');
  L.push('');
  L.push('Total de sessões registradas: '+total+'  ');
  if(todas.length)L.push('Última atualização: '+dataLegivelHist(todas[todas.length-1].data)+'  ');
  if(meta.arquivos.length){
    var lista=meta.arquivos.slice().reverse().map(function(a){return '`'+a+'`'});
    L.push('Este arquivo guarda a partir da sessão '+(base+1)+'. As anteriores estão '+
           (lista.length===1?'no arquivo fechado '+lista[0]:
             'nos arquivos fechados '+lista.slice(0,-1).join(', ')+' e '+lista[lista.length-1])+
           ', com até '+CFG.limiteHistorico+' sessões cada.');
  }
  L.push('');
  L.push('<!-- volumes:'+JSON.stringify({anteriores:base,arquivos:meta.arquivos,ate:meta.ate||''})+' -->');
  L.push('');
  L.push('---');
  L.push('');
  todas.slice().reverse().forEach(function(s,i){L.push(blocoHistorico(s,total-i))});
  return L.join('\n');
}

/* Texto de um arquivo fechado: n é o número do arquivo e primeiro o
   número da primeira sessão dele. */
function gerarVolume(sessoes,n,primeiro){
  var ultimo=primeiro+sessoes.length-1;
  var L=[];
  L.push('# Histórico de alterações do catálogo · arquivo '+n+', sessões '+primeiro+' a '+ultimo);
  L.push('');
  L.push('Arquivo fechado: guarda '+sessoes.length+' sessões e não recebe mais nenhuma.');
  L.push('As mais novas estão em `historico.md`. Não edite este arquivo à mão.');
  L.push('');
  L.push('De '+dataLegivelHist(sessoes[0].data)+' a '+dataLegivelHist(sessoes[sessoes.length-1].data)+'.');
  L.push('');
  L.push('<!-- volume:'+JSON.stringify({numero:n,de:primeiro,ate:ultimo})+' -->');
  L.push('');
  L.push('---');
  L.push('');
  sessoes.slice().reverse().forEach(function(s,i){L.push(blocoHistorico(s,ultimo-i))});
  return L.join('\n');
}

/* Separa em arquivos fechados o que passar do limite. Devolve as sessões
   que ficam no historico.md, a divisão atualizada e os arquivos fechados
   novos (caminho completo e texto). */
function dividirHistorico(todas,meta){
  meta=meta||{anteriores:0,arquivos:[],ate:''};
  var m={anteriores:meta.anteriores||0,arquivos:(meta.arquivos||[]).slice(),ate:meta.ate||''};
  var resto=todas.slice(),volumes=[],lim=CFG.limiteHistorico;
  while(resto.length>lim){
    var bloco=resto.slice(0,lim),n=m.arquivos.length+1,nome=nomeVolume(n);
    volumes.push({caminho:pastaHistorico()+nome,nome:nome,
                  texto:gerarVolume(bloco,n,m.anteriores+1),
                  de:m.anteriores+1,ate:m.anteriores+lim});
    m.anteriores+=lim;
    m.arquivos.push(nome);
    m.ate=bloco[bloco.length-1].data||m.ate;
    resto=resto.slice(lim);
  }
  return {atuais:resto,meta:m,volumes:volumes};
}

/* Todos os arquivos a gravar para registrar estas sessões: primeiro os
   fechados novos, se houver, e por último o historico.md. */
function montarHistorico(todas,meta){
  var d=dividirHistorico(todas,meta);
  return {
    arquivos:d.volumes.concat([{caminho:CFG.caminhoHistorico,texto:gerarHistorico(d.atuais,d.meta)}]),
    volumes:d.volumes,
    texto:gerarHistorico(d.atuais,d.meta),
    meta:d.meta,
    atuais:d.atuais,
    sessoes:d.meta.anteriores+d.atuais.length
  };
}

/* Junta o histórico que está no repositório com as sessões locais mais
   a nova. Sessões repetidas, com a mesma data e o mesmo autor, entram
   uma vez só. */
/* O que vale é a divisão que está no repositório: sessões locais com
   data até a última já arquivada ficam de fora, porque já estão num
   arquivo fechado. texto é o novo historico.md; arquivos traz também os
   arquivos fechados que precisam ser criados agora. */
function mesclarHistorico(textoRemoto,locais,nova){
  var meta=metaHistorico(textoRemoto);
  var mapa=new Map();
  lerHistorico(textoRemoto).concat(locais||[]).concat(nova?[nova]:[]).forEach(function(s){
    if(!s)return;
    if(meta.ate&&String(s.data||'')<=String(meta.ate))return;
    var k=(s.data||'')+'|'+(s.autor||'');
    if(!mapa.has(k))mapa.set(k,s);
  });
  var todas=[...mapa.values()].sort(function(a,b){
    return String(a.data||'').localeCompare(String(b.data||''))});
  var h=montarHistorico(todas,meta);
  return {texto:h.texto,arquivos:h.arquivos,volumes:h.volumes,meta:h.meta,sessoes:h.sessoes,
          anteriores:meta.anteriores+lerHistorico(textoRemoto).length};
}

/* Lê o histórico publicado, acrescenta a sessão e devolve os arquivos
   prontos para enviar. sha é o do historico.md que serviu de base. */
async function historicoCom(sessao){
  var r=await obterTexto(CFG.caminhoHistorico);
  var m=mesclarHistorico(r.texto,[],sessao);
  return {caminho:CFG.caminhoHistorico,texto:m.texto,sha:r.sha,sessoes:m.sessoes,volumes:m.volumes};
}

/* Registra a sessão no repositório: grava os arquivos fechados novos,
   se houver, e depois o historico.md. Se o historico.md mudou no meio
   do caminho, refaz a leitura e tenta de novo. */
async function registrarHistorico(sessao,mensagemEnvio){
  var ultimo;
  for(var t=0;t<3;t++){
    var h=await historicoCom(sessao);
    try{
      for(var i=0;i<h.volumes.length;i++){
        var v=h.volumes[i],s=await situacao(v.caminho);
        await enviar({caminho:v.caminho,texto:v.texto,sha:s.sha,
                      mensagem:'Histórico: fecha o arquivo '+v.nome+' (sessões '+v.de+' a '+v.ate+')'});
      }
      return await enviar({caminho:h.caminho,texto:h.texto,sha:h.sha,mensagem:mensagemEnvio});
    }catch(e){
      ultimo=e;
      if(e.tipo!=='conflito')throw e;
    }
  }
  throw ultimo;
}

/* Lê do próprio site o histórico inteiro: o historico.md e os arquivos
   fechados que ele aponta. base é o caminho da pasta do histórico a
   partir da página (por exemplo 'editor-catalogo/' ou ''). Devolve as
   sessões da mais antiga para a mais nova, a divisão e os arquivos que
   não puderam ser lidos. */
async function carregarHistoricoDoSite(base){
  base=base||'';
  var r=await fetch(base+'historico.md?t='+Date.now());
  if(!r.ok)throw erro('rede','Não consegui ler o historico.md.');
  var texto=await r.text();
  var meta=metaHistorico(texto);
  var textos=await Promise.all(meta.arquivos.map(function(a){
    return fetch(base+a+'?t='+Date.now()).then(function(x){return x.ok?x.text():null})
      .catch(function(){return null});
  }));
  /* O número de cada sessão vem do arquivo onde ela está, e não da
     posição na lista: assim, se um arquivo fechado não puder ser lido,
     as demais sessões continuam com o número certo. */
  var faltando=[],mapa=new Map(),numeros=new Map();
  function juntar(t,primeiro){
    lerHistorico(t||'').forEach(function(s,j){
      var k=(s.data||'')+'|'+(s.autor||'');
      if(!mapa.has(k)){mapa.set(k,s);numeros.set(s,primeiro+j)}
    });
  }
  textos.forEach(function(t,i){
    if(t===null){faltando.push(meta.arquivos[i]);return}
    var v=/<!--\s*volume:(\{[\s\S]*?\})\s*-->/.exec(t),de=i*CFG.limiteHistorico+1;
    if(v){try{de=+JSON.parse(v[1]).de||de}catch(e){}}
    juntar(t,de);
  });
  juntar(texto,meta.anteriores+1);
  var todas=[...mapa.values()].sort(function(a,b){
    return String(a.data||'').localeCompare(String(b.data||''))});
  return {sessoes:todas,meta:meta,faltando:faltando,atuais:lerHistorico(texto),
          numero:function(s){return numeros.get(s)||0},
          total:meta.anteriores+lerHistorico(texto).length};
}

global.Publicar={
  cfg:CFG,
  lerHistorico:lerHistorico,
  gerarHistorico:gerarHistorico,
  gerarVolume:gerarVolume,
  metaHistorico:metaHistorico,
  dividirHistorico:dividirHistorico,
  montarHistorico:montarHistorico,
  registrarHistorico:registrarHistorico,
  carregarHistoricoDoSite:carregarHistoricoDoSite,
  blocoHistorico:blocoHistorico,
  mesclarHistorico:mesclarHistorico,
  historicoCom:historicoCom,
  dataLegivelHist:dataLegivelHist,
  configurar:configurar,
  temChave:temChave,
  autor:autor,
  situacao:situacao,
  obter:obter,
  obterTexto:obterTexto,
  ultimoCommit:ultimoCommit,
  enviar:enviar,
  excluir:excluir,
  hashGit:hashGit,
  bytesDeTexto:bytesDeTexto,
  textoDeBytes:textoDeBytes,
  base64DeBytes:base64DeBytes,
  bytesDeBase64:bytesDeBase64,
  tempoRelativo:tempoRelativo,
  mensagem:mensagem,
  tamanhoLegivel:tamanhoLegivel
};

})(window);
