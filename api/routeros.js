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

const CAMPOS_SMTP_CONFIG = new Set([
  'address',
  'port',
  'from',
  'user',
  'password',
  'tls',
  'certificate-verification',
  'vrf',
]);

const CAMPOS_SMTP_ENVIO = new Set(['to', 'subject', 'body']);
const SMTP_PROPLIST_SEGURO = 'address,server,port,from,user,tls,certificate-verification,vrf';

function erroValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 422;
  return erro;
}

function lerCorpo(req) {
  if (req.body === undefined || req.body === null || req.body === '') return undefined;
  if (req.body && typeof req.body === 'object') return { ...req.body };

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

function parametrosLeituraSeguros(caminho, metodo, req) {
  const parametros = lerParametros(req);
  if (metodo === 'GET' && caminho === 'tool/e-mail') {
    return {
      ...(parametros ?? {}),
      '.proplist': SMTP_PROPLIST_SEGURO,
    };
  }
  return parametros;
}

function exigeConfirmacaoRisco(caminho, metodo) {
  if (!ehMutacao(metodo)) return false;
  return caminho.startsWith('ip/firewall/') || caminho.startsWith('ipv6/firewall/');
}

function validarMac(mac) {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(String(mac));
}

function validarIPv4(ip) {
  const partes = String(ip).split('/')[0].split('.');
  return partes.length === 4 && partes.every((parte) => /^\d{1,3}$/.test(parte) && Number(parte) <= 255);
}

function validarTexto(valor, { campo, maximo, permitirVazio = true, trim = true }) {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw erroValidacao(`${campo} precisa ser texto.`);
  }

  const textoOriginal = String(valor);
  const texto = trim ? textoOriginal.trim() : textoOriginal;
  if (!permitirVazio && !texto) throw erroValidacao(`${campo} é obrigatório.`);
  if (texto.length > maximo) throw erroValidacao(`${campo} excede o tamanho máximo de ${maximo} caracteres.`);
  if (/\0/.test(texto)) throw erroValidacao(`${campo} contém caracteres inválidos.`);
  return texto;
}

function validarDestinatarioEmail(valor) {
  const email = validarTexto(valor, { campo: 'Destinatário', maximo: 320, permitirVazio: false });
  if (/\r|\n/.test(email) || !/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw erroValidacao('Destinatário de e-mail inválido.');
  }
  return email;
}

function garantirCamposPermitidos(corpo, permitidos, contexto) {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    throw erroValidacao(`Dados de ${contexto} são obrigatórios.`);
  }

  const extras = Object.keys(corpo).filter((chave) => !permitidos.has(chave));
  if (extras.length) {
    throw erroValidacao(`Campo não permitido em ${contexto}: ${extras[0]}.`);
  }
}

function normalizarComandoSmtp(caminho, metodo, corpo) {
  if (metodo !== 'POST' || !caminho.startsWith('tool/e-mail/')) return corpo;

  if (caminho === 'tool/e-mail/set') {
    garantirCamposPermitidos(corpo, CAMPOS_SMTP_CONFIG, 'configuração SMTP');

    const normalizado = {};
    if ('address' in corpo) normalizado.address = validarTexto(corpo.address, { campo: 'Servidor SMTP', maximo: 255, permitirVazio: false });
    if ('from' in corpo) normalizado.from = validarTexto(corpo.from, { campo: 'Remetente', maximo: 320 });
    if ('user' in corpo) normalizado.user = validarTexto(corpo.user, { campo: 'Usuário SMTP', maximo: 320 });
    if ('password' in corpo) normalizado.password = validarTexto(corpo.password, { campo: 'Senha SMTP', maximo: 256, trim: false });
    if ('vrf' in corpo) normalizado.vrf = validarTexto(corpo.vrf, { campo: 'VRF', maximo: 64, permitirVazio: false });

    if ('port' in corpo) {
      const porta = Number(corpo.port);
      if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw erroValidacao('Porta SMTP precisa estar entre 1 e 65535.');
      }
      normalizado.port = String(porta);
    }

    if ('tls' in corpo) {
      const tls = String(corpo.tls);
      if (!['no', 'yes', 'starttls'].includes(tls)) throw erroValidacao('Modo TLS inválido.');
      normalizado.tls = tls;
    }

    if ('certificate-verification' in corpo) {
      const verificacao = String(corpo['certificate-verification']);
      if (!['no', 'yes', 'yes-without-crl'].includes(verificacao)) {
        throw erroValidacao('Modo de verificação de certificado inválido.');
      }
      normalizado['certificate-verification'] = verificacao;
    }

    if (!Object.keys(normalizado).length) throw erroValidacao('Nenhuma configuração SMTP foi informada.');
    return normalizado;
  }

  if (caminho === 'tool/e-mail/send') {
    garantirCamposPermitidos(corpo, CAMPOS_SMTP_ENVIO, 'teste SMTP');
    return {
      to: validarDestinatarioEmail(corpo.to),
      subject: validarTexto(corpo.subject, { campo: 'Assunto', maximo: 160, permitirVazio: false }),
      body: validarTexto(corpo.body ?? '', { campo: 'Mensagem', maximo: 4000, trim: false }),
    };
  }

  return corpo;
}

async function validarAlteracaoLease(caminho, metodo, corpo) {
  if (!['PUT', 'PATCH'].includes(metodo)) return;
  if (!(caminho === 'ip/dhcp-server/lease' || /^ip\/dhcp-server\/lease\/\*[A-Za-z0-9]+$/.test(caminho))) return;
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    const erro = new Error('Dados do lease DHCP são obrigatórios.');
    erro.status = 422;
    throw erro;
  }

  if (corpo['mac-address'] && !validarMac(corpo['mac-address'])) {
    const erro = new Error('Endereço MAC inválido. Use AA:BB:CC:DD:EE:FF.');
    erro.status = 422;
    throw erro;
  }

  if (corpo.address && !validarIPv4(corpo.address)) {
    const erro = new Error('Endereço IPv4 inválido para o lease DHCP.');
    erro.status = 422;
    throw erro;
  }

  if (!corpo.address && !corpo['mac-address']) return;

  const leases = await requisitarRouterOS('ip/dhcp-server/lease', { metodo: 'GET' });
  const idAtual = caminho.startsWith('ip/dhcp-server/lease/*') ? caminho.split('/').at(-1) : null;
  const mac = corpo['mac-address']?.toUpperCase();
  const ip = corpo.address;

  const conflito = (Array.isArray(leases) ? leases : []).find((lease) => {
    if (idAtual && lease['.id'] === idAtual) return false;
    const mesmoMac = mac && String(lease['mac-address'] ?? '').toUpperCase() === mac;
    const mesmoIp = ip && lease.address === ip;
    return mesmoMac || mesmoIp;
  });

  if (conflito) {
    const erro = new Error(
      conflito.address === ip
        ? `O IP ${ip} já está associado a outro lease.`
        : `O MAC ${corpo['mac-address']} já está associado a outro lease.`,
    );
    erro.status = 409;
    throw erro;
  }
}

function validarComandoLease(caminho, metodo, corpo) {
  if (caminho !== 'ip/dhcp-server/lease/make-static' || metodo !== 'POST') return;

  if (!corpo?.numbers || !/^\*[A-Za-z0-9]+$/.test(String(corpo.numbers))) {
    const erro = new Error('Identificador do lease inválido para conversão em estático.');
    erro.status = 422;
    throw erro;
  }
}

function normalizarComandoMove(caminho, metodo, corpo) {
  if (metodo !== 'POST' || !/^(ip|ipv6)\/firewall\/(filter|nat|mangle|raw)\/move$/.test(caminho)) {
    return corpo;
  }

  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    const erro = new Error('Dados obrigatórios para reordenar a regra não foram informados.');
    erro.status = 422;
    throw erro;
  }

  const id = corpo['.id'] ?? corpo.numbers;
  const destino = corpo.destination;

  if (!/^\*[A-Za-z0-9]+$/.test(String(id ?? '')) || !/^\*[A-Za-z0-9]+$/.test(String(destino ?? ''))) {
    const erro = new Error('Identificadores inválidos para reordenar a regra de firewall.');
    erro.status = 422;
    throw erro;
  }

  return {
    '.id': String(id),
    destination: String(destino),
  };
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
    let corpo = lerCorpo(req);

    corpo = normalizarComandoSmtp(acesso.caminho, metodo, corpo);
    await validarAlteracaoLease(acesso.caminho, metodo, corpo);
    validarComandoLease(acesso.caminho, metodo, corpo);
    corpo = normalizarComandoMove(acesso.caminho, metodo, corpo);

    if (ehMutacao(metodo) && (acesso.caminho.startsWith('ip/firewall/') || acesso.caminho.startsWith('ipv6/firewall/'))) {
      await criarExportSeguranca();
    }

    const dados = await requisitarRouterOS(acesso.caminho, {
      metodo,
      corpo,
      parametros: metodo === 'GET' ? parametrosLeituraSeguros(acesso.caminho, metodo, req) : undefined,
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
