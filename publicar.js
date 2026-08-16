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
var CFG={dono:'csmonteserrat',nome:'guiailustrado',ramo:'main'};

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

global.Publicar={
  cfg:CFG,
  configurar:configurar,
  temChave:temChave,
  autor:autor,
  situacao:situacao,
  obter:obter,
  obterTexto:obterTexto,
  ultimoCommit:ultimoCommit,
  enviar:enviar,
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
