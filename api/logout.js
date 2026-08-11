import {
  limparCookieSessao,
  semCache,
  validarOrigemMutacao,
} from './_lib/seguranca.js';

export default async function handler(req, res) {
  semCache(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  if (!validarOrigemMutacao(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  limparCookieSessao(req, res);
  return res.status(200).json({ autenticado: false });
}
