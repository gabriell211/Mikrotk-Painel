const HYDRA_RELAY_LIST = 'HYDRA_SMTP_RELAYS';
const HYDRA_CLIENT_LIST = 'HYDRA_SMTP_CLIENTS';
const HYDRA_RULE_FORWARD = 'HYDRA | Anti-phishing | bloquear SMTP direto';
const HYDRA_RULE_OUTPUT = 'HYDRA | Anti-phishing | proteger SMTP do RouterOS';
const HYDRA_RULE_PREFIX = 'HYDRA | Anti-phishing |';
const HYDRA_LOG_PREFIX = 'HYDRA-SMTP-DROP ';
const HYDRA_ROUTER_LOG_PREFIX = 'HYDRA-SMTP-ROUTER ';
const SMTP_PORTS = new Set(['25', '465', '587']);

const ui = {
  areaSmtp: document.querySelector('#area-smtp'),
  smtpAddress: document.querySelector('#smtp-address'),
  smtpFrom: document.querySelector('#smtp-from'),
  smtpTls: document.querySelector('#smtp-tls'),
  smtpCertificate: document.querySelector('#smtp-certificate'),
  smtpMenu: document.querySelector('[data-secao="smtp"]'),
  smtpReload: document.querySelector('#smtp-recarregar'),
  modal: document.querySelector('#modal-confirmacao'),
  modalTitle: document.querySelector('#titulo-confirmacao'),
  modalText: document.querySelector('#texto-confirmacao'),
  modalWarning: document.querySelector('#aviso-confirmacao'),
  modalCancel: document.querySelector('#cancelar-confirmacao'),
  modalAccept: document.querySelector('#aceitar-confirmacao'),
  toasts: document.querySelector('#toasts'),
};

const estado = {
  regras: [],
  listas: [],
  conexoes: [],
  logs: [],
};

function toast(mensagem, tipo = '') {
  const item = document.createElement('div');
  item.className = `toast ${tipo}`.trim();
  item.textContent = mensagem;
  ui.toasts?.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

async function requisicaoApi(url, opcoes = {}) {
  const headers = new Headers(opcoes.headers ?? {});
  if (opcoes.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const resposta = await fetch(url, {
    ...opcoes,
    headers,
    credentials: 'same-origin',
  });

  const tipo = resposta.headers.get('content-type') ?? '';
  const dados = tipo.includes('application/json') ? await resposta.json() : await resposta.text();
  if (!resposta.ok) {
    const erro = new Error(dados?.erro || dados?.message || `Erro HTTP ${resposta.status}.`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

async function routerOS(caminho, { metodo = 'GET', corpo, parametros, risco = false } = {}) {
  const query = new URLSearchParams({ path: caminho });
  if (parametros && Object.keys(parametros).length) {
    query.set('parametros', JSON.stringify(parametros));
  }

  const headers = {};
  if (risco) headers['X-Confirmacao-Risco'] = 'APLICAR';

  return requisicaoApi(`/api/routeros?${query.toString()}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

function confirmar({ titulo, texto, aviso = '' }) {
  return new Promise((resolve) => {
    ui.modalTitle.textContent = titulo;
    ui.modalText.textContent = texto;
    ui.modalWarning.textContent = aviso;
    ui.modalWarning.classList.toggle('oculto', !aviso);
    ui.modalAccept.classList.add('perigo');
    ui.modalAccept.classList.remove('primario');
    ui.modal.showModal();

    const concluir = (resultado) => {
      ui.modalAccept.onclick = null;
      ui.modalCancel.onclick = null;
      ui.modal.close();
      resolve(resultado);
    };

    ui.modalAccept.onclick = () => concluir(true);
    ui.modalCancel.onclick = () => concluir(false);
  });
}

function validarIPv4(ip) {
  const partes = String(ip).split('.');
  return partes.length === 4 && partes.every((parte) => /^\d{1,3}$/.test(parte) && Number(parte) <= 255);
}

function validarIPv4OuRede(valor) {
  const [ip, prefixo, ...resto] = String(valor).split('/');
  if (resto.length || !validarIPv4(ip)) return false;
  if (prefixo === undefined) return true;
  return /^\d{1,2}$/.test(prefixo) && Number(prefixo) >= 0 && Number(prefixo) <= 32;
}

function validarHostname(valor) {
  const hostname = String(valor).trim().toLowerCase().replace(/\.$/, '');
  if (!hostname || hostname.length > 253 || hostname.includes('://') || hostname.includes('/') || hostname.includes(':')) return false;
  const labels = hostname.split('.');
  return labels.length >= 2 && labels.every((label) => (
    label.length > 0
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ));
}

function itensTexto(valor) {
  return [...new Set(String(valor ?? '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

function booleanoRouterOS(valor) {
  return valor === true || valor === 'true' || valor === 'yes';
}

function ipParaNumero(ip) {
  if (!validarIPv4(ip)) return null;
  return ip.split('.').reduce((acc, parte) => ((acc << 8) | Number(parte)) >>> 0, 0) >>> 0;
}

function ipPertence(ip, alvo) {
  if (!validarIPv4(ip)) return false;
  if (!String(alvo).includes('/')) return ip === alvo;

  const [rede, prefixoBruto] = String(alvo).split('/');
  if (!validarIPv4(rede)) return false;
  const prefixo = Number(prefixoBruto);
  if (!Number.isInteger(prefixo) || prefixo < 0 || prefixo > 32) return false;
  if (prefixo === 0) return true;

  const mascara = (0xffffffff << (32 - prefixo)) >>> 0;
  return (ipParaNumero(ip) & mascara) === (ipParaNumero(rede) & mascara);
}

function montarArea() {
  const grade = ui.areaSmtp?.querySelector('.smtp-grid');
  if (!grade || document.querySelector('#smtp-security-card')) return;

  document.querySelector('#smtp-firewall-destino')?.closest('.smtp-card')?.classList.add('oculto');

  const card = document.createElement('article');
  card.id = 'smtp-security-card';
  card.className = 'smtp-card span-2 smtp-security-card';
  card.innerHTML = `
    <header>
      <h2>Proteção de e-mail / Anti-phishing</h2>
      <p>Restringe SMTP direto aos relays autorizados, protege o próprio RouterOS e monitora tentativas suspeitas. É uma proteção de borda: conteúdo recebido continua sendo analisado pelo provedor ou gateway de e-mail.</p>
    </header>

    <div class="smtp-security-metrics" aria-label="Estado da proteção SMTP">
      <div class="smtp-security-metric"><span>Proteção</span><strong id="smtp-security-state">Verificando...</strong></div>
      <div class="smtp-security-metric"><span>Relays</span><strong id="smtp-security-relays">—</strong></div>
      <div class="smtp-security-metric"><span>Conexões suspeitas</span><strong id="smtp-security-suspicious">—</strong></div>
      <div class="smtp-security-metric"><span>Bloqueios registrados</span><strong id="smtp-security-blocked">—</strong></div>
    </div>

    <form id="form-smtp-security" class="smtp-form smtp-security-form">
      <div class="smtp-form-grid">
        <label>
          Relays SMTP autorizados
          <textarea id="smtp-security-relays-input" rows="5" spellcheck="false" placeholder="smtp.office365.com\n203.0.113.10"></textarea>
          <small>Um DNS, IP ou rede por linha. O servidor SMTP configurado acima é incluído automaticamente.</small>
        </label>
        <label>
          Redes IPv4 protegidas
          <textarea id="smtp-security-clients-input" rows="5" spellcheck="false" placeholder="192.168.0.0/16\n10.20.0.0/16"></textarea>
          <small>Use 0.0.0.0/0 somente se quiser aplicar a política a todo tráfego IPv4 encaminhado.</small>
        </label>
      </div>

      <div class="smtp-security-options">
        <label><input id="smtp-security-router" type="checkbox" checked> Proteger também o SMTP originado pelo próprio RouterOS</label>
        <label><input id="smtp-security-harden" type="checkbox" checked> Exigir TLS e validação de certificado no cliente SMTP do RouterOS</label>
      </div>

      <div class="smtp-acoes">
        <button id="smtp-security-use-config" class="botao secundario" type="button">Usar servidor SMTP configurado</button>
        <button id="smtp-security-scan" class="botao secundario" type="button">Analisar agora</button>
        <button id="smtp-security-remove" class="botao fantasma" type="button">Remover proteção</button>
        <button id="smtp-security-apply" class="botao primario" type="submit">Aplicar proteção</button>
      </div>
    </form>

    <div class="smtp-nota-risco">
      <strong>Política:</strong> conexões novas TCP/25, 465 e 587 das redes protegidas são bloqueadas quando o destino não pertence à lista <code>${HYDRA_RELAY_LIST}</code>. O HYDRA não cria ACCEPT que contorne seu firewall; apenas adiciona bloqueios para SMTP não autorizado e registra os eventos.
    </div>

    <div class="smtp-security-columns">
      <section>
        <h3>Conexões SMTP suspeitas ativas</h3>
        <div id="smtp-security-connections" class="smtp-security-list">Ainda não analisado.</div>
      </section>
      <section>
        <h3>Últimos bloqueios</h3>
        <div id="smtp-security-logs" class="smtp-security-list">Ainda não analisado.</div>
      </section>
    </div>

    <section class="smtp-domain-check">
      <div>
        <h3>SPF, DKIM e DMARC</h3>
        <p>Verifica os registros públicos do domínio de envio para detectar autenticação ausente ou fraca contra spoofing.</p>
      </div>
      <form id="form-domain-security" class="smtp-domain-form">
        <label>Domínio <input id="smtp-domain" type="text" maxlength="253" placeholder="empresa.com.br" required></label>
        <label>Seletor DKIM <input id="smtp-dkim-selector" type="text" maxlength="63" value="default" required></label>
        <button id="smtp-domain-check" class="botao secundario" type="submit">Verificar domínio</button>
      </form>
      <div id="smtp-domain-result" class="smtp-domain-result">Informe o domínio usado no remetente para verificar SPF, DKIM e DMARC.</div>
    </section>
  `;

  grade.append(card);
  ui.security = {
    form: card.querySelector('#form-smtp-security'),
    state: card.querySelector('#smtp-security-state'),
    relayCount: card.querySelector('#smtp-security-relays'),
    suspiciousCount: card.querySelector('#smtp-security-suspicious'),
    blockedCount: card.querySelector('#smtp-security-blocked'),
    relays: card.querySelector('#smtp-security-relays-input'),
    clients: card.querySelector('#smtp-security-clients-input'),
    router: card.querySelector('#smtp-security-router'),
    harden: card.querySelector('#smtp-security-harden'),
    useConfig: card.querySelector('#smtp-security-use-config'),
    scan: card.querySelector('#smtp-security-scan'),
    remove: card.querySelector('#smtp-security-remove'),
    apply: card.querySelector('#smtp-security-apply'),
    connections: card.querySelector('#smtp-security-connections'),
    logs: card.querySelector('#smtp-security-logs'),
    domainForm: card.querySelector('#form-domain-security'),
    domain: card.querySelector('#smtp-domain'),
    selector: card.querySelector('#smtp-dkim-selector'),
    domainButton: card.querySelector('#smtp-domain-check'),
    domainResult: card.querySelector('#smtp-domain-result'),
  };

  const starttls = ui.smtpTls?.querySelector('option[value="starttls"]');
  const tlsObrigatorio = ui.smtpTls?.querySelector('option[value="yes"]');
  if (starttls) starttls.textContent = 'STARTTLS oportunista';
  if (tlsObrigatorio) tlsObrigatorio.textContent = 'TLS obrigatório';
}

async function regrasFirewall() {
  const dados = await routerOS('ip/firewall/filter');
  return Array.isArray(dados) ? dados : [];
}

async function listasFirewall() {
  const dados = await routerOS('ip/firewall/address-list');
  return Array.isArray(dados) ? dados : [];
}

async function conexoesFirewall() {
  const dados = await routerOS('ip/firewall/connection');
  return Array.isArray(dados) ? dados : [];
}

async function logsRouterOS() {
  const dados = await routerOS('log', { parametros: { '.proplist': 'time,topics,message' } });
  return Array.isArray(dados) ? dados : [];
}

function relaysResolvidos(listas) {
  return listas
    .filter((item) => item.list === HYDRA_RELAY_LIST)
    .map((item) => String(item.address ?? '').trim())
    .filter((item) => validarIPv4OuRede(item));
}

function conexoesSuspeitas(conexoes, relays) {
  return conexoes.filter((conexao) => {
    if (String(conexao.protocol ?? '').toLowerCase() !== 'tcp') return false;
    if (!SMTP_PORTS.has(String(conexao['dst-port'] ?? ''))) return false;
    const destino = String(conexao['dst-address'] ?? '');
    if (!validarIPv4(destino)) return false;
    return !relays.some((relay) => ipPertence(destino, relay));
  });
}

function logsProtecao(logs) {
  return logs
    .filter((item) => {
      const mensagem = String(item.message ?? '');
      return mensagem.includes(HYDRA_LOG_PREFIX) || mensagem.includes(HYDRA_ROUTER_LOG_PREFIX);
    })
    .slice(-20)
    .reverse();
}

function linha(principal, detalhe = '') {
  const item = document.createElement('div');
  item.className = 'smtp-security-row';
  const strong = document.createElement('strong');
  strong.textContent = principal;
  item.append(strong);
  if (detalhe) {
    const small = document.createElement('small');
    small.textContent = detalhe;
    item.append(small);
  }
  return item;
}

function renderizar() {
  if (!ui.security) return;

  const regraForward = estado.regras.find((item) => item.comment === HYDRA_RULE_FORWARD && !booleanoRouterOS(item.disabled));
  const regraOutput = estado.regras.find((item) => item.comment === HYDRA_RULE_OUTPUT && !booleanoRouterOS(item.disabled));
  const relays = estado.listas.filter((item) => item.list === HYDRA_RELAY_LIST && !booleanoRouterOS(item.dynamic));
  const clientes = estado.listas.filter((item) => item.list === HYDRA_CLIENT_LIST && !booleanoRouterOS(item.dynamic));
  const suspeitas = conexoesSuspeitas(estado.conexoes, relaysResolvidos(estado.listas));
  const bloqueios = logsProtecao(estado.logs);
  const ativa = Boolean(regraForward && relays.length && clientes.length);

  ui.security.state.textContent = ativa ? 'Ativa' : 'Inativa';
  ui.security.state.classList.toggle('texto-sucesso', ativa);
  ui.security.state.classList.toggle('texto-perigo', !ativa);
  ui.security.relayCount.textContent = String(relays.length);
  ui.security.suspiciousCount.textContent = String(suspeitas.length);
  ui.security.blockedCount.textContent = String(bloqueios.length || Number(regraForward?.packets ?? 0));

  if (regraForward || relays.length || clientes.length) {
    ui.security.router.checked = Boolean(regraOutput);
  }

  if (!ui.security.relays.matches(':focus')) {
    const cadastrados = relays.map((item) => item.address);
    const servidor = ui.smtpAddress?.value.trim() ?? '';
    ui.security.relays.value = cadastrados.length ? cadastrados.join('\n') : servidor;
  }
  if (!ui.security.clients.matches(':focus')) {
    ui.security.clients.value = clientes.map((item) => item.address).join('\n');
  }

  ui.security.connections.replaceChildren();
  if (!suspeitas.length) {
    ui.security.connections.append(linha('Nenhuma conexão SMTP suspeita ativa.', 'Não há sessões fora dos relays resolvidos neste momento.'));
  } else {
    suspeitas.slice(0, 12).forEach((conexao) => {
      ui.security.connections.append(linha(
        `${conexao['src-address'] ?? 'origem'} → ${conexao['dst-address'] ?? 'destino'}:${conexao['dst-port'] ?? ''}`,
        `Estado: ${conexao['tcp-state'] || conexao['connection-state'] || 'desconhecido'}`,
      ));
    });
  }

  ui.security.logs.replaceChildren();
  if (!bloqueios.length) {
    ui.security.logs.append(linha('Nenhum bloqueio recente no buffer.', 'O contador da regra ainda é usado como indicador acumulado quando disponível.'));
  } else {
    bloqueios.slice(0, 12).forEach((log) => {
      ui.security.logs.append(linha(
        String(log.message ?? '').replace(HYDRA_LOG_PREFIX, '').replace(HYDRA_ROUTER_LOG_PREFIX, ''),
        `${log.time ?? ''} ${log.topics ?? ''}`.trim(),
      ));
    });
  }
}

async function carregar() {
  if (!ui.security) return;
  ui.security.scan.disabled = true;
  ui.security.state.textContent = 'Verificando...';

  const resultados = await Promise.allSettled([
    regrasFirewall(),
    listasFirewall(),
    conexoesFirewall(),
    logsRouterOS(),
  ]);

  estado.regras = resultados[0].status === 'fulfilled' ? resultados[0].value : [];
  estado.listas = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
  estado.conexoes = resultados[2].status === 'fulfilled' ? resultados[2].value : [];
  estado.logs = resultados[3].status === 'fulfilled' ? resultados[3].value : [];
  renderizar();

  if (resultados.some((resultado) => resultado.status === 'rejected')) {
    toast('Parte do diagnóstico de segurança não pôde ser carregada.', 'erro');
  }
  ui.security.scan.disabled = false;
}

async function removerEntrada(caminho, id, risco = false) {
  if (!id) return;
  await routerOS(`${caminho}/${id}`, { metodo: 'DELETE', risco });
}

async function limparLista(nomeLista) {
  const listas = await listasFirewall();
  const entradas = listas.filter((item) => item.list === nomeLista && !booleanoRouterOS(item.dynamic));
  for (const entrada of entradas) {
    await removerEntrada('ip/firewall/address-list', entrada['.id'], true);
  }
}

async function preencherLista(nomeLista, valores, tipo) {
  for (const valor of valores) {
    await routerOS('ip/firewall/address-list', {
      metodo: 'PUT',
      risco: true,
      corpo: {
        list: nomeLista,
        address: valor,
        comment: `HYDRA | ${tipo} | ${valor}`,
      },
    });
  }
}

async function upsertRegra(comentario, corpo) {
  const regras = await regrasFirewall();
  const existente = regras.find((item) => item.comment === comentario);
  if (existente?.['.id']) {
    await routerOS(`ip/firewall/filter/${existente['.id']}`, {
      metodo: 'PATCH',
      risco: true,
      corpo,
    });
    return;
  }

  await routerOS('ip/firewall/filter', { metodo: 'PUT', risco: true, corpo });
}

async function removerRegrasLegadas() {
  const regras = await regrasFirewall();
  const legadas = regras.filter((item) => {
    const comentario = String(item.comment ?? '');
    return comentario.startsWith('HYDRA | SMTP ') || comentario === 'HYDRA | Bloqueio SMTP 25';
  });
  for (const regra of legadas) await removerEntrada('ip/firewall/filter', regra['.id'], true);
}

async function posicionarNoTopo() {
  let regras = await regrasFirewall();
  let forward = regras.find((item) => item.comment === HYDRA_RULE_FORWARD);
  let output = regras.find((item) => item.comment === HYDRA_RULE_OUTPUT);
  const primeiroNaoHydra = regras.find((item) => !String(item.comment ?? '').startsWith(HYDRA_RULE_PREFIX));

  if (output?.['.id'] && primeiroNaoHydra?.['.id']) {
    await routerOS('ip/firewall/filter/move', {
      metodo: 'POST',
      risco: true,
      corpo: { numbers: output['.id'], destination: primeiroNaoHydra['.id'] },
    });
  }

  regras = await regrasFirewall();
  forward = regras.find((item) => item.comment === HYDRA_RULE_FORWARD);
  output = regras.find((item) => item.comment === HYDRA_RULE_OUTPUT);
  const destino = output?.['.id'] || regras.find((item) => !String(item.comment ?? '').startsWith(HYDRA_RULE_PREFIX))?.['.id'];
  if (forward?.['.id'] && destino && forward['.id'] !== destino) {
    await routerOS('ip/firewall/filter/move', {
      metodo: 'POST',
      risco: true,
      corpo: { numbers: forward['.id'], destination: destino },
    });
  }
}

function lerConfiguracao() {
  const relays = itensTexto(ui.security.relays.value);
  const clientes = itensTexto(ui.security.clients.value);
  const servidor = ui.smtpAddress?.value.trim() ?? '';
  if (servidor && !relays.includes(servidor)) relays.unshift(servidor);

  if (!relays.length) throw new Error('Informe ao menos um relay SMTP autorizado.');
  if (!clientes.length) throw new Error('Informe ao menos uma rede IPv4 protegida.');

  const relayInvalido = relays.find((item) => !(validarIPv4OuRede(item) || validarHostname(item)));
  if (relayInvalido) throw new Error(`Relay SMTP inválido: ${relayInvalido}.`);
  const clienteInvalido = clientes.find((item) => !validarIPv4OuRede(item));
  if (clienteInvalido) throw new Error(`Rede protegida inválida: ${clienteInvalido}.`);

  return {
    relays,
    clientes,
    protegerRouter: ui.security.router.checked,
    endurecerSmtp: ui.security.harden.checked,
  };
}

async function aplicar(evento) {
  evento.preventDefault();
  let config;
  try {
    config = lerConfiguracao();
  } catch (erro) {
    toast(erro.message, 'erro');
    return;
  }

  const aceito = await confirmar({
    titulo: 'Aplicar proteção SMTP?',
    texto: 'Novas conexões SMTP para destinos fora da allowlist serão bloqueadas.',
    aviso: config.clientes.includes('0.0.0.0/0')
      ? '0.0.0.0/0 protege todo o tráfego IPv4 encaminhado. Cadastre todos os relays legítimos antes de confirmar.'
      : 'Uma allowlist incompleta pode interromper envios legítimos. Revise relays e redes protegidas.',
  });
  if (!aceito) return;

  ui.security.apply.disabled = true;
  ui.security.remove.disabled = true;
  ui.security.apply.textContent = 'Aplicando...';

  try {
    await limparLista(HYDRA_RELAY_LIST);
    await limparLista(HYDRA_CLIENT_LIST);
    await preencherLista(HYDRA_RELAY_LIST, config.relays, 'SMTP relay');
    await preencherLista(HYDRA_CLIENT_LIST, config.clientes, 'SMTP rede protegida');

    await upsertRegra(HYDRA_RULE_FORWARD, {
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'connection-state': 'new',
      'src-address-list': HYDRA_CLIENT_LIST,
      'dst-address-list': `!${HYDRA_RELAY_LIST}`,
      'dst-port': '25,465,587',
      log: 'yes',
      'log-prefix': HYDRA_LOG_PREFIX,
      disabled: 'no',
      comment: HYDRA_RULE_FORWARD,
    });

    if (config.protegerRouter) {
      await upsertRegra(HYDRA_RULE_OUTPUT, {
        chain: 'output',
        action: 'drop',
        protocol: 'tcp',
        'connection-state': 'new',
        'dst-address-list': `!${HYDRA_RELAY_LIST}`,
        'dst-port': '25,465,587',
        log: 'yes',
        'log-prefix': HYDRA_ROUTER_LOG_PREFIX,
        disabled: 'no',
        comment: HYDRA_RULE_OUTPUT,
      });
    } else {
      const regras = await regrasFirewall();
      const existente = regras.find((item) => item.comment === HYDRA_RULE_OUTPUT);
      if (existente?.['.id']) await removerEntrada('ip/firewall/filter', existente['.id'], true);
    }

    if (config.endurecerSmtp) {
      await routerOS('tool/e-mail/set', {
        metodo: 'POST',
        corpo: { tls: 'yes', 'certificate-verification': 'yes' },
      });
      if (ui.smtpTls) ui.smtpTls.value = 'yes';
      if (ui.smtpCertificate) ui.smtpCertificate.value = 'yes';
    }

    await removerRegrasLegadas();
    await posicionarNoTopo();
    toast('Proteção SMTP aplicada. Envios diretos fora da allowlist serão bloqueados.', 'sucesso');
    await carregar();
  } catch (erro) {
    toast(`Falha ao aplicar proteção SMTP: ${erro.message}`, 'erro');
    await carregar();
  } finally {
    ui.security.apply.disabled = false;
    ui.security.remove.disabled = false;
    ui.security.apply.textContent = 'Aplicar proteção';
  }
}

async function remover() {
  const aceito = await confirmar({
    titulo: 'Remover proteção SMTP?',
    texto: 'As regras e listas gerenciadas pelo HYDRA serão removidas.',
    aviso: 'Depois disso, o firewall existente voltará a decidir sozinho sobre conexões SMTP diretas.',
  });
  if (!aceito) return;

  ui.security.remove.disabled = true;
  try {
    const regras = await regrasFirewall();
    const gerenciadas = regras.filter((item) => String(item.comment ?? '').startsWith(HYDRA_RULE_PREFIX));
    for (const regra of gerenciadas) await removerEntrada('ip/firewall/filter', regra['.id'], true);
    await limparLista(HYDRA_RELAY_LIST);
    await limparLista(HYDRA_CLIENT_LIST);
    toast('Proteção SMTP removida.', 'sucesso');
    await carregar();
  } catch (erro) {
    toast(`Falha ao remover proteção SMTP: ${erro.message}`, 'erro');
  } finally {
    ui.security.remove.disabled = false;
  }
}

function usarServidorConfigurado() {
  const servidor = ui.smtpAddress?.value.trim() ?? '';
  if (!servidor) {
    toast('Configure primeiro o endereço do servidor SMTP.', 'erro');
    return;
  }
  const relays = itensTexto(ui.security.relays.value);
  if (!relays.includes(servidor)) relays.unshift(servidor);
  ui.security.relays.value = relays.join('\n');
}

function badgeDominio(rotulo, ok, detalhe) {
  const item = document.createElement('div');
  item.className = `smtp-domain-badge ${ok ? 'ok' : 'falha'}`;
  const strong = document.createElement('strong');
  strong.textContent = rotulo;
  const span = document.createElement('span');
  span.textContent = detalhe;
  item.append(strong, span);
  return item;
}

async function verificarDominio(evento) {
  evento.preventDefault();
  const dominio = ui.security.domain.value.trim();
  const seletor = ui.security.selector.value.trim();
  ui.security.domainButton.disabled = true;
  ui.security.domainButton.textContent = 'Verificando...';
  ui.security.domainResult.textContent = 'Consultando registros TXT públicos...';

  try {
    const query = new URLSearchParams({ dominio, seletor });
    const resultado = await requisicaoApi(`/api/email-security?${query.toString()}`);
    ui.security.domainResult.replaceChildren();

    const score = document.createElement('div');
    score.className = 'smtp-domain-score';
    score.textContent = `Pontuação de autenticação: ${resultado.pontuacao}/100`;
    ui.security.domainResult.append(score);
    ui.security.domainResult.append(
      badgeDominio('SPF', resultado.spf.configurado && !resultado.spf.duplicado, resultado.spf.duplicado ? 'Múltiplos registros SPF' : resultado.spf.configurado ? 'Configurado' : 'Ausente'),
      badgeDominio('DKIM', resultado.dkim.configurado, resultado.dkim.configurado ? `Seletor ${resultado.seletor} encontrado` : `Seletor ${resultado.seletor} não encontrado`),
      badgeDominio('DMARC', resultado.dmarc.configurado && resultado.dmarc.forte, resultado.dmarc.configurado ? `Política p=${resultado.dmarc.politica || 'não definida'}` : 'Ausente'),
    );
  } catch (erro) {
    ui.security.domainResult.textContent = `Falha na verificação: ${erro.message}`;
  } finally {
    ui.security.domainButton.disabled = false;
    ui.security.domainButton.textContent = 'Verificar domínio';
  }
}

function preencherDominioDoRemetente() {
  if (!ui.security?.domain || ui.security.domain.value) return;
  const remetente = ui.smtpFrom?.value.trim() ?? '';
  const dominio = remetente.includes('@') ? remetente.split('@').at(-1) : '';
  if (dominio) ui.security.domain.value = dominio;
}

function registrarEventos() {
  ui.security.form.addEventListener('submit', aplicar);
  ui.security.remove.addEventListener('click', remover);
  ui.security.scan.addEventListener('click', carregar);
  ui.security.useConfig.addEventListener('click', usarServidorConfigurado);
  ui.security.domainForm.addEventListener('submit', verificarDominio);
  ui.smtpMenu?.addEventListener('click', () => {
    window.setTimeout(() => {
      preencherDominioDoRemetente();
      carregar();
    }, 0);
  });
  ui.smtpReload?.addEventListener('click', () => window.setTimeout(carregar, 250));
}

montarArea();
if (ui.security) registrarEventos();
