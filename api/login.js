import {
  definirCookieSessao,
  limparTentativasLogin,
  semCache,
  validarCredenciais,
  validarOrigemMutacao,
  verificarLimiteLogin,
} from './_lib/seguranca.js';

function corpoJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length <= 16_384) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  semCache(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  if (!validarOrigemMutacao(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  const limite = verificarLimiteLogin(req);
  if (!limite.permitido) {
    res.setHeader('Retry-After', String(limite.tentarNovamenteEm));
    return res.status(429).json({ erro: 'Muitas tentativas de login. Tente novamente mais tarde.' });
  }

  try {
    const corpo = corpoJson(req);
    const usuario = String(corpo.usuario ?? '').trim();
    const senha = String(corpo.senha ?? '');

    if (!usuario || !senha) {
      return res.status(422).json({ erro: 'Informe usuário e senha.' });
    }

    if (!validarCredenciais(usuario, senha)) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    limparTentativasLogin(req);
    definirCookieSessao(req, res, usuario);

    return res.status(200).json({ autenticado: true, usuario });
  } catch (erro) {
    console.error('Falha no login:', erro);
    return res.status(500).json({ erro: 'Falha na configuração de autenticação do painel.' });
  }
}
