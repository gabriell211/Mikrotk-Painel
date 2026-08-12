const RECURSOS_PERMITIDOS = [
  'system/resource',
  'system/identity',
  'interface',
  'interface/vlan',
  'ip/address',
  'ip/arp',
  'ip/dhcp-server/lease',
  'ip/firewall/filter',
  'ip/firewall/nat',
  'ip/firewall/mangle',
  'ip/firewall/raw',
  'ip/firewall/address-list',
  'ip/firewall/connection',
  'ip/firewall/layer7-protocol',
  'ip/firewall/service-port',
  'ipv6/firewall/filter',
  'ipv6/firewall/nat',
  'ipv6/firewall/raw',
  'ipv6/firewall/address-list',
  'ipv6/firewall/connection',
  'tool/e-mail',
];

const COMANDOS_POST_PERMITIDOS = [
  /^ip\/firewall\/(filter|nat|mangle|raw)\/move$/,
  /^ipv6\/firewall\/(filter|nat|raw)\/move$/,
  /^ip\/dhcp-server\/lease\/make-static$/,
  /^tool\/e-mail\/(set|send)$/,
];

const METODOS_MUTAVEIS = new Set(['PUT', 'PATCH', 'DELETE', 'POST']);

function configuracao() {
  const url = process.env.MIKROTIK_URL?.trim();
  const usuario = process.env.MIKROTIK_USUARIO?.trim();
  const senha = process.env.MIKROTIK_SENHA ?? '';
  const cloudflareClientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID?.trim();
  const cloudflareClientSecret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim();

  if (!url || !usuario) {
    throw new Error('MIKROTIK_URL e MIKROTIK_USUARIO precisam estar configurados.');
  }

  if (Boolean(cloudflareClientId) !== Boolean(cloudflareClientSecret)) {
    throw new Error('CLOUDFLARE_ACCESS_CLIENT_ID e CLOUDFLARE_ACCESS_CLIENT_SECRET devem ser configurados juntos.');
  }

  const base = new URL(url);
  const permitirHttp = process.env.MIKROTIK_PERMITIR_HTTP === 'true';

  if (base.protocol !== 'https:' && !(permitirHttp && base.protocol === 'http:')) {
    throw new Error('MIKROTIK_URL deve usar HTTPS. HTTP só é aceito quando MIKROTIK_PERMITIR_HTTP=true.');
  }

  base.pathname = base.pathname.replace(/\/rest\/?$/, '').replace(/\/$/, '');

  return {
    base,
    usuario,
    senha,
    cloudflareClientId,
    cloudflareClientSecret,
    timeoutMs: Math.min(Math.max(Number(process.env.MIKROTIK_TIMEOUT_MS ?? 10000), 1000), 30000),
  };
}

export function normalizarCaminho(caminhoRecebido) {
  let caminho = String(caminhoRecebido ?? '').trim();

  try {
    caminho = decodeURIComponent(caminho);
  } catch {
    throw new Error('Caminho RouterOS inválido.');
  }

  caminho = caminho.replace(/^\/+/, '').replace(/\/+$/, '');
  caminho = caminho.replace(/^rest\//, '');

  if (!caminho || caminho.includes('..') || caminho.includes('\\') || caminho.includes('?') || caminho.includes('#')) {
    throw new Error('Caminho RouterOS inválido.');
  }

  if (!/^[a-zA-Z0-9*._/-]+$/.test(caminho)) {
    throw new Error('Caminho RouterOS contém caracteres não permitidos.');
  }

  return caminho;
}

export function validarAcessoRecurso(caminhoRecebido, metodoRecebido) {
  const caminho = normalizarCaminho(caminhoRecebido);
  const metodo = String(metodoRecebido ?? 'GET').toUpperCase();

  const recursoValido = RECURSOS_PERMITIDOS.some(
    (raiz) => caminho === raiz || caminho.startsWith(`${raiz}/`),
  );

  if (!recursoValido) {
    return { permitido: false, motivo: 'Recurso RouterOS não permitido pelo painel.', caminho, metodo };
  }

  if (!['GET', 'PUT', 'PATCH', 'DELETE', 'POST'].includes(metodo)) {
    return { permitido: false, motivo: 'Método HTTP não permitido.', caminho, metodo };
  }

  if (metodo === 'POST' && !COMANDOS_POST_PERMITIDOS.some((regex) => regex.test(caminho))) {
    return {
      permitido: false,
      motivo: 'POST é restrito a comandos administrativos explicitamente permitidos.',
      caminho,
      metodo,
    };
  }

  if (process.env.PAINEL_MODO_SOMENTE_LEITURA === 'true' && METODOS_MUTAVEIS.has(metodo)) {
    return { permitido: false, motivo: 'O painel está em modo somente leitura.', caminho, metodo };
  }

  return { permitido: true, caminho, metodo };
}

async function executar(caminho, { metodo = 'GET', corpo, parametros } = {}) {
  const {
    base,
    usuario,
    senha,
    cloudflareClientId,
    cloudflareClientSecret,
    timeoutMs,
  } = configuracao();
  const url = new URL(`${base.toString().replace(/\/$/, '')}/rest/${caminho}`);

  if (parametros && typeof parametros === 'object') {
    for (const [chave, valor] of Object.entries(parametros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        url.searchParams.set(chave, String(valor));
      }
    }
  }

  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${usuario}:${senha}`, 'utf8').toString('base64')}`,
      ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
    };

    if (cloudflareClientId && cloudflareClientSecret) {
      headers['CF-Access-Client-Id'] = cloudflareClientId;
      headers['CF-Access-Client-Secret'] = cloudflareClientSecret;
    }

    const resposta = await fetch(url, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controlador.signal,
      redirect: 'error',
    });

    const texto = await resposta.text();
    let dados = null;

    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = { mensagem: texto };
      }
    }

    if (!resposta.ok) {
      const erro = new Error(
        dados?.detail || dados?.message || dados?.mensagem || `RouterOS respondeu HTTP ${resposta.status}.`,
      );
      erro.status = resposta.status;
      erro.dados = dados;
      throw erro;
    }

    return dados ?? [];
  } catch (erro) {
    if (erro?.name === 'AbortError') {
      const timeout = new Error('Tempo limite ao conectar com o MikroTik.');
      timeout.status = 504;
      throw timeout;
    }

    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

export async function requisitarRouterOS(caminhoRecebido, opcoes = {}) {
  const acesso = validarAcessoRecurso(caminhoRecebido, opcoes.metodo ?? 'GET');

  if (!acesso.permitido) {
    const erro = new Error(acesso.motivo);
    erro.status = 403;
    throw erro;
  }

  return executar(acesso.caminho, {
    metodo: acesso.metodo,
    corpo: opcoes.corpo,
    parametros: opcoes.parametros,
  });
}

export async function criarExportSeguranca() {
  if (process.env.MIKROTIK_AUTO_EXPORT !== 'true') {
    return { executado: false };
  }

  await executar('export', {
    metodo: 'POST',
    corpo: {
      compact: '',
      file: 'painel-web-ultimo-backup',
    },
  });

  return { executado: true, arquivo: 'painel-web-ultimo-backup.rsc' };
}

export function ehMutacao(metodo) {
  return METODOS_MUTAVEIS.has(String(metodo ?? '').toUpperCase());
}
