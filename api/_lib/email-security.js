import { resolveTxt } from 'node:dns/promises';

function erroValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 422;
  return erro;
}

export function normalizarDominio(valor) {
  const dominio = String(valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');

  if (!dominio || dominio.length > 253) {
    throw erroValidacao('Domínio inválido.');
  }

  if (dominio.includes('://') || dominio.includes('/') || dominio.includes(':')) {
    throw erroValidacao('Informe somente o domínio, sem protocolo, porta ou caminho.');
  }

  const rotulos = dominio.split('.');
  if (rotulos.length < 2 || rotulos.some((rotulo) => (
    !rotulo
    || rotulo.length > 63
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(rotulo)
  ))) {
    throw erroValidacao('Domínio inválido.');
  }

  return dominio;
}

export function normalizarSeletor(valor) {
  const seletor = String(valor ?? 'default').trim().toLowerCase();
  if (!seletor || seletor.length > 63 || !/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(seletor)) {
    throw erroValidacao('Seletor DKIM inválido.');
  }
  return seletor;
}

function juntarTxt(registros) {
  return (Array.isArray(registros) ? registros : [])
    .map((partes) => Array.isArray(partes) ? partes.join('') : String(partes ?? ''))
    .map((registro) => registro.trim())
    .filter(Boolean);
}

function politicaDmarc(registro) {
  const encontrado = /(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\s*(?:;|$)/i.exec(registro ?? '');
  return encontrado?.[1]?.toLowerCase() ?? null;
}

export function avaliarRegistrosEmail({ dominio, seletor, spf = [], dmarc = [], dkim = [] }) {
  const spfRegistros = juntarTxt(spf).filter((registro) => /^v=spf1(?:\s|$)/i.test(registro));
  const dmarcRegistros = juntarTxt(dmarc).filter((registro) => /^v=dmarc1(?:;|\s|$)/i.test(registro));
  const dkimRegistros = juntarTxt(dkim).filter((registro) => /^v=dkim1(?:;|\s|$)/i.test(registro));
  const politica = politicaDmarc(dmarcRegistros[0]);

  const resultado = {
    dominio,
    seletor,
    spf: {
      configurado: spfRegistros.length > 0,
      duplicado: spfRegistros.length > 1,
      registros: spfRegistros,
    },
    dmarc: {
      configurado: dmarcRegistros.length > 0,
      politica,
      forte: politica === 'quarantine' || politica === 'reject',
      registros: dmarcRegistros,
    },
    dkim: {
      configurado: dkimRegistros.length > 0,
      registros: dkimRegistros,
    },
  };

  let pontuacao = 0;
  if (resultado.spf.configurado && !resultado.spf.duplicado) pontuacao += 30;
  if (resultado.dkim.configurado) pontuacao += 30;
  if (resultado.dmarc.configurado) pontuacao += resultado.dmarc.forte ? 40 : 20;
  resultado.pontuacao = Math.min(pontuacao, 100);

  return resultado;
}

async function consultarTxt(nome) {
  try {
    return await resolveTxt(nome);
  } catch (erro) {
    if (['ENODATA', 'ENOTFOUND', 'SERVFAIL', 'ETIMEOUT'].includes(erro?.code)) return [];
    throw erro;
  }
}

export async function verificarAutenticacaoEmail(dominioRecebido, seletorRecebido = 'default') {
  const dominio = normalizarDominio(dominioRecebido);
  const seletor = normalizarSeletor(seletorRecebido);

  const [spf, dmarc, dkim] = await Promise.all([
    consultarTxt(dominio),
    consultarTxt(`_dmarc.${dominio}`),
    consultarTxt(`${seletor}._domainkey.${dominio}`),
  ]);

  return avaliarRegistrosEmail({ dominio, seletor, spf, dmarc, dkim });
}
