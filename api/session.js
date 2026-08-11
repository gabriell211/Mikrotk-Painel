import { semCache, validarSessao } from './_lib/seguranca.js';

export default async function handler(req, res) {
  semCache(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const sessao = validarSessao(req);

  if (!sessao) {
    return res.status(401).json({ autenticado: false });
  }

  return res.status(200).json({
    autenticado: true,
    usuario: sessao.usuario,
    expiraEm: sessao.expiraEm,
  });
}
