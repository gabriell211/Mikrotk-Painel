import { exigirSessao, semCache } from './_lib/seguranca.js';
import { verificarAutenticacaoEmail } from './_lib/email-security.js';

export default async function handler(req, res) {
  semCache(res);

  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const dominio = Array.isArray(req.query?.dominio) ? req.query.dominio[0] : req.query?.dominio;
  const seletor = Array.isArray(req.query?.seletor) ? req.query.seletor[0] : req.query?.seletor;

  try {
    const resultado = await verificarAutenticacaoEmail(dominio, seletor || 'default');
    return res.status(200).json(resultado);
  } catch (erro) {
    const status = Number.isInteger(erro?.status) && erro.status >= 400 && erro.status <= 599
      ? erro.status
      : 502;

    return res.status(status).json({
      erro: erro?.message || 'Falha ao consultar autenticação do domínio.',
    });
  }
}
