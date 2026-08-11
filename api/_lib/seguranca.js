import crypto from 'node:crypto';

const NOME_COOKIE = 'mikrotk_sessao';
const DURACAO_SESSAO_SEGUNDOS = 8 * 60 * 60;
const tentativasLogin = new Map();

function segredoSessao() {
  const segredo = process.env.SESSION_SECRET;

  if (!segredo || Buffer.byteLength(segredo) < 32) {
    throw new Error('SESSION_SECRET deve possuir pelo menos 32 bytes.');
  }

  return segredo;
}

function assinatura(valor) {
  return crypto
    .createHmac('sha256', segredoSessao())
    .update(valor)
    .digest('base64url');
}

function compararSeguro(a, b) {
  const bufferA = Buffer.from(String(a ?? ''), 'utf8');
  const bufferB = Buffer.from(String(b ?? ''), 'utf8');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function lerCookies(req) {
  const cabecalho = req.headers.cookie ?? '';

  return Object.fromEntries(
    cabecalho
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const indice = item.indexOf('=');
        if (indice === -1) return [item, ''];
        return [item.slice(0, indice), decodeURIComponent(item.slice(indice + 1))];
      }),
  );
}

export function criarTokenSessao(usuario) {
  const payload = Buffer.from(
    JSON.stringify({
      usuario,
      expiraEm: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS,
    }),
    'utf8',
  ).toString('base64url');

  return `${payload}.${assinatura(payload)}`;
}

export function validarSessao(req) {
  try {
    const token = lerCookies(req)[NOME_COOKIE];
    if (!token) return null;

    const [payload, assinaturaRecebida] = token.split('.');
    if (!payload || !assinaturaRecebida) return null;

    const assinaturaEsperada = assinatura(payload);
    if (!compararSeguro(assinaturaRecebida, assinaturaEsperada)) return null;

    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!dados.usuario || !dados.expiraEm) return null;
    if (dados.expiraEm <= Math.floor(Date.now() / 1000)) return null;

    return dados;
  } catch {
    return null;
  }
}

export function exigirSessao(req, res) {
  const sessao = validarSessao(req);

  if (!sessao) {
    res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    return null;
  }

  return sessao;
}

export function definirCookieSessao(req, res, usuario) {
  const token = criarTokenSessao(usuario);
  const seguro = process.env.VERCEL === '1' || req.headers['x-forwarded-proto'] === 'https';

  res.setHeader(
    'Set-Cookie',
    `${NOME_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACAO_SESSAO_SEGUNDOS}${seguro ? '; Secure' : ''}`,
  );
}

export function limparCookieSessao(req, res) {
  const seguro = process.env.VERCEL === '1' || req.headers['x-forwarded-proto'] === 'https';

  res.setHeader(
    'Set-Cookie',
    `${NOME_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${seguro ? '; Secure' : ''}`,
  );
}

export function validarCredenciais(usuario, senha) {
  const usuarioConfigurado = process.env.PAINEL_USUARIO;
  const senhaConfigurada = process.env.PAINEL_SENHA;

  if (!usuarioConfigurado || !senhaConfigurada) {
    throw new Error('PAINEL_USUARIO e PAINEL_SENHA precisam estar configurados.');
  }

  return compararSeguro(usuario, usuarioConfigurado) && compararSeguro(senha, senhaConfigurada);
}

export function verificarLimiteLogin(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'desconhecido')
    .split(',')[0]
    .trim();
  const agora = Date.now();
  const janelaMs = 10 * 60 * 1000;
  const limite = 8;
  const atual = tentativasLogin.get(ip);

  if (!atual || atual.expiraEm <= agora) {
    tentativasLogin.set(ip, { quantidade: 1, expiraEm: agora + janelaMs });
    return { permitido: true };
  }

  atual.quantidade += 1;
  tentativasLogin.set(ip, atual);

  if (atual.quantidade > limite) {
    return {
      permitido: false,
      tentarNovamenteEm: Math.ceil((atual.expiraEm - agora) / 1000),
    };
  }

  return { permitido: true };
}

export function limparTentativasLogin(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'desconhecido')
    .split(',')[0]
    .trim();
  tentativasLogin.delete(ip);
}

export function validarOrigemMutacao(req) {
  const origemPermitida = process.env.ORIGEM_PERMITIDA?.trim();
  if (!origemPermitida) return true;

  const origem = req.headers.origin;
  return typeof origem === 'string' && origem === origemPermitida;
}

export function semCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
}
