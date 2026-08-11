import {
  criarExportSeguranca,
  ehMutacao,
  requisitarRouterOS,
  validarAcessoRecurso,
} from './_lib/routeros.js';
import {
  exigirSessao,
  semCache,
  validarOrigemMutacao,
} from './_lib/seguranca.js';

function lerCorpo(req) {
  if (req.body === undefined || req.body === null || req.body === '') return undefined;
  if (req.body && typeof req.body === 'object') return req.body;

  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > 65_536) {
      const erro = new Error('Corpo da requisição excede 64 KB.');
      erro.status = 413;
      throw erro;
    }

    try {
      return JSON.parse(req.body);
    } catch {
      const erro = new Error('JSON inválido.');
      erro.status = 400;
      throw erro;
    }
  }

  const erro = new Error('Formato de corpo não suportado.');
  erro.status = 400;
  throw erro;
}

function lerParametros(req) {
  const bruto = req.query?.parametros;
  if (!bruto) return undefined;

  try {
    const valor = JSON.parse(Array.isArray(bruto) ? bruto[0] : bruto);
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : undefined;
  } catch {
    return undefined;
  }
}

function exigeConfirmacaoRisco(caminho, metodo) {
  if (!ehMutacao(metodo)) return false;
  return caminho.startsWith('ip/firewall/') || caminho.startsWith('ipv6/firewall/');
}

export default async function handler(req, res) {
  semCache(res);

  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  const metodo = String(req.method ?? 'GET').toUpperCase();
  const caminhoRecebido = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
  const acesso = validarAcessoRecurso(caminhoRecebido, metodo);

  if (!acesso.permitido) {
    return res.status(403).json({ erro: acesso.motivo });
  }

  if (ehMutacao(metodo) && !validarOrigemMutacao(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  if (exigeConfirmacaoRisco(acesso.caminho, metodo)) {
    const confirmacao = req.headers['x-confirmacao-risco'];
    if (confirmacao !== 'APLICAR') {
      return res.status(428).json({
        erro: 'Alterações de firewall exigem confirmação explícita de risco.',
        codigo: 'CONFIRMACAO_FIREWALL_NECESSARIA',
      });
    }
  }

  try {
    const corpo = lerCorpo(req);

    if (ehMutacao(metodo) && (acesso.caminho.startsWith('ip/firewall/') || acesso.caminho.startsWith('ipv6/firewall/'))) {
      await criarExportSeguranca();
    }

    const dados = await requisitarRouterOS(acesso.caminho, {
      metodo,
      corpo,
      parametros: metodo === 'GET' ? lerParametros(req) : undefined,
    });

    if (metodo === 'DELETE') {
      return res.status(200).json({ sucesso: true });
    }

    return res.status(200).json(dados);
  } catch (erro) {
    console.error(`Falha RouterOS em ${metodo} ${acesso.caminho}:`, erro);

    const status = Number.isInteger(erro?.status) && erro.status >= 400 && erro.status <= 599
      ? erro.status
      : 502;

    return res.status(status).json({
      erro: erro?.message || 'Falha ao comunicar com o MikroTik.',
      detalhes: erro?.dados ?? undefined,
    });
  }
}
