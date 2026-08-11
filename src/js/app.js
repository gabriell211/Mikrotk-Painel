const opcoesSimNao = [
  { valor: 'no', rotulo: 'Não' },
  { valor: 'yes', rotulo: 'Sim' },
];

const camposFirewallBase = [
  { chave: 'chain', rotulo: 'Chain', placeholder: 'input, forward, output...' },
  { chave: 'action', rotulo: 'Ação', placeholder: 'accept, drop, reject...' },
  { chave: 'protocol', rotulo: 'Protocolo', placeholder: 'tcp, udp, icmp...' },
  { chave: 'src-address', rotulo: 'IP / rede de origem', placeholder: '192.168.1.0/24' },
  { chave: 'dst-address', rotulo: 'IP / rede de destino', placeholder: '0.0.0.0/0' },
  { chave: 'src-port', rotulo: 'Porta de origem', placeholder: '80 ou 1000-2000' },
  { chave: 'dst-port', rotulo: 'Porta de destino', placeholder: '22,80,443' },
  { chave: 'in-interface', rotulo: 'Interface de entrada', placeholder: 'ether1' },
  { chave: 'out-interface', rotulo: 'Interface de saída', placeholder: 'bridge' },
  { chave: 'comment', rotulo: 'Comentário', placeholder: 'Descrição da regra' },
  { chave: 'log', rotulo: 'Gerar log', tipo: 'select', opcoes: opcoesSimNao },
  { chave: 'disabled', rotulo: 'Desabilitada', tipo: 'select', opcoes: opcoesSimNao },
];

const recursos = {
  dispositivos: {
    titulo: 'Dispositivos / DHCP',
    descricao: 'Amarração MAC → IP, bloqueio e controle de banda por lease.',
    caminho: 'ip/dhcp-server/lease',
    criar: true,
    editar: true,
    excluir: true,
    colunas: [
      ['comment', 'Nome / comentário'],
      ['host-name', 'Hostname'],
      ['mac-address', 'MAC'],
      ['address', 'IP'],
      ['server', 'Servidor'],
      ['status', 'Status'],
      ['dynamic', 'Dinâmico'],
      ['block-access', 'Bloqueado'],
      ['rate-limit', 'Limite'],
    ],
    campos: [
      { chave: 'address', rotulo: 'IP fixo', placeholder: '192.168.88.20', requerido: true },
      { chave: 'mac-address', rotulo: 'Endereço MAC', placeholder: 'AA:BB:CC:DD:EE:FF', requerido: true },
      { chave: 'server', rotulo: 'Servidor DHCP', placeholder: 'dhcp1' },
      { chave: 'comment', rotulo: 'Nome / comentário', placeholder: 'PC Financeiro' },
      { chave: 'block-access', rotulo: 'Bloquear acesso', tipo: 'select', opcoes: opcoesSimNao },
      { chave: 'rate-limit', rotulo: 'Limite de banda', placeholder: '10M/10M' },
      { chave: 'lease-time', rotulo: 'Tempo do lease', placeholder: '1d ou 0s' },
      { chave: 'address-lists', rotulo: 'Lista de endereços', placeholder: 'equipamentos_confiaveis' },
      { chave: 'disabled', rotulo: 'Desabilitado', tipo: 'select', opcoes: opcoesSimNao },
    ],
    mutavel: (registro) => registro.dynamic !== 'true',
    acaoEspecial: 'dhcp',
  },
  arp: {
    titulo: 'Tabela ARP',
    descricao: 'Mapeamento entre endereços IP e MAC conhecidos pelo roteador.',
    caminho: 'ip/arp',
    criar: true,
    editar: true,
    excluir: true,
    colunas: [
      ['address', 'IP'],
      ['mac-address', 'MAC'],
      ['interface', 'Interface'],
      ['dynamic', 'Dinâmico'],
      ['complete', 'Completo'],
      ['published', 'Publicado'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'address', rotulo: 'Endereço IP', placeholder: '192.168.88.20', requerido: true },
      { chave: 'mac-address', rotulo: 'Endereço MAC', placeholder: 'AA:BB:CC:DD:EE:FF', requerido: true },
      { chave: 'interface', rotulo: 'Interface', placeholder: 'bridge' },
      { chave: 'published', rotulo: 'Publicado', tipo: 'select', opcoes: opcoesSimNao },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'Entrada ARP estática' },
    ],
    mutavel: (registro) => registro.dynamic !== 'true',
  },
  interfaces: {
    titulo: 'Interfaces',
    descricao: 'Estado das interfaces e ativação/desativação administrativa.',
    caminho: 'interface',
    criar: false,
    editar: true,
    excluir: false,
    colunas: [
      ['name', 'Nome'],
      ['type', 'Tipo'],
      ['actual-mtu', 'MTU'],
      ['running', 'Ativa'],
      ['disabled', 'Desabilitada'],
      ['mac-address', 'MAC'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'name', rotulo: 'Nome', placeholder: 'ether1' },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'WAN principal' },
      { chave: 'disabled', rotulo: 'Desabilitada', tipo: 'select', opcoes: opcoesSimNao },
    ],
  },
  vlans: {
    titulo: 'VLANs',
    descricao: 'Interfaces VLAN 802.1Q configuradas no RouterOS.',
    caminho: 'interface/vlan',
    criar: true,
    editar: true,
    excluir: true,
    colunas: [
      ['name', 'Nome'],
      ['vlan-id', 'VLAN ID'],
      ['interface', 'Interface pai'],
      ['mtu', 'MTU'],
      ['running', 'Ativa'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'name', rotulo: 'Nome', placeholder: 'vlan-usuarios', requerido: true },
      { chave: 'vlan-id', rotulo: 'VLAN ID', placeholder: '20', requerido: true },
      { chave: 'interface', rotulo: 'Interface pai', placeholder: 'bridge', requerido: true },
      { chave: 'mtu', rotulo: 'MTU', placeholder: '1500' },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'Rede de usuários' },
      { chave: 'disabled', rotulo: 'Desabilitada', tipo: 'select', opcoes: opcoesSimNao },
    ],
  },
  'enderecos-ip': {
    titulo: 'Endereços IP',
    descricao: 'Endereços IPv4 configurados nas interfaces do roteador.',
    caminho: 'ip/address',
    criar: true,
    editar: true,
    excluir: true,
    colunas: [
      ['address', 'Endereço'],
      ['network', 'Rede'],
      ['interface', 'Interface'],
      ['dynamic', 'Dinâmico'],
      ['disabled', 'Desabilitado'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'address', rotulo: 'Endereço / prefixo', placeholder: '192.168.88.1/24', requerido: true },
      { chave: 'network', rotulo: 'Rede', placeholder: '192.168.88.0' },
      { chave: 'interface', rotulo: 'Interface', placeholder: 'bridge', requerido: true },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'Gateway LAN' },
      { chave: 'disabled', rotulo: 'Desabilitado', tipo: 'select', opcoes: opcoesSimNao },
    ],
    mutavel: (registro) => registro.dynamic !== 'true',
  },
  'firewall-filtro': {
    titulo: 'Firewall — Regras de filtro',
    descricao: 'Controle de tráfego nas chains input, forward e output. A ordem das regras é significativa.',
    caminho: 'ip/firewall/filter',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['dst-address', 'Destino'],
      ['dst-port', 'Porta'],
      ['in-interface', 'Entrada'],
      ['out-interface', 'Saída'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: camposFirewallBase,
  },
  'firewall-nat': {
    titulo: 'Firewall — NAT',
    descricao: 'Source NAT, destination NAT, masquerade, redirect e redirecionamento de portas.',
    caminho: 'ip/firewall/nat',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['dst-address', 'Destino'],
      ['dst-port', 'Porta destino'],
      ['to-addresses', 'Para IP'],
      ['to-ports', 'Para porta'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: [
      ...camposFirewallBase,
      { chave: 'to-addresses', rotulo: 'Traduzir para IP', placeholder: '192.168.88.10' },
      { chave: 'to-ports', rotulo: 'Traduzir para porta', placeholder: '443' },
    ],
  },
  'firewall-mangle': {
    titulo: 'Firewall — Mangle',
    descricao: 'Marcação de conexões, pacotes, roteamento e políticas avançadas.',
    caminho: 'ip/firewall/mangle',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['new-connection-mark', 'Marca conexão'],
      ['new-packet-mark', 'Marca pacote'],
      ['new-routing-mark', 'Marca rota'],
      ['passthrough', 'Passthrough'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: [
      ...camposFirewallBase,
      { chave: 'new-connection-mark', rotulo: 'Nova marca de conexão', placeholder: 'conn_wan1' },
      { chave: 'new-packet-mark', rotulo: 'Nova marca de pacote', placeholder: 'packet_wan1' },
      { chave: 'new-routing-mark', rotulo: 'Nova marca de roteamento', placeholder: 'to_wan1' },
      { chave: 'passthrough', rotulo: 'Passthrough', tipo: 'select', opcoes: opcoesSimNao },
    ],
  },
  'firewall-raw': {
    titulo: 'Firewall — RAW',
    descricao: 'Filtragem antes do connection tracking para bloqueios e mitigação com baixo custo de CPU.',
    caminho: 'ip/firewall/raw',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['dst-address', 'Destino'],
      ['dst-port', 'Porta'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: camposFirewallBase,
  },
  'listas-endereco': {
    titulo: 'Firewall — Listas de endereços',
    descricao: 'Grupos de IPs e redes reutilizáveis pelas regras de filtro, NAT, Mangle e RAW.',
    caminho: 'ip/firewall/address-list',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    colunas: [
      ['list', 'Lista'],
      ['address', 'Endereço'],
      ['creation-time', 'Criado em'],
      ['timeout', 'Timeout'],
      ['dynamic', 'Dinâmico'],
      ['disabled', 'Desabilitado'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'list', rotulo: 'Nome da lista', placeholder: 'bloqueados', requerido: true },
      { chave: 'address', rotulo: 'IP, rede ou domínio', placeholder: '203.0.113.0/24', requerido: true },
      { chave: 'timeout', rotulo: 'Timeout', placeholder: '1d ou none-dynamic' },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'Origem bloqueada' },
      { chave: 'disabled', rotulo: 'Desabilitado', tipo: 'select', opcoes: opcoesSimNao },
    ],
    mutavel: (registro) => registro.dynamic !== 'true',
  },
  conexoes: {
    titulo: 'Firewall — Conexões ativas',
    descricao: 'Tabela de connection tracking em tempo real. Visualização somente leitura.',
    caminho: 'ip/firewall/connection',
    criar: false,
    editar: false,
    excluir: false,
    somenteLeitura: true,
    colunas: [
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['src-port', 'Porta origem'],
      ['dst-address', 'Destino'],
      ['dst-port', 'Porta destino'],
      ['connection-state', 'Estado'],
      ['timeout', 'Timeout'],
      ['fasttrack', 'FastTrack'],
    ],
    campos: [],
  },
  'service-port': {
    titulo: 'Firewall — Service Ports',
    descricao: 'Helpers de protocolos controlados pelo connection tracking do RouterOS.',
    caminho: 'ip/firewall/service-port',
    criar: false,
    editar: true,
    excluir: false,
    firewall: true,
    colunas: [
      ['name', 'Serviço'],
      ['ports', 'Portas'],
      ['disabled', 'Desabilitado'],
    ],
    campos: [
      { chave: 'disabled', rotulo: 'Desabilitado', tipo: 'select', opcoes: opcoesSimNao },
    ],
  },
  'ipv6-filtro': {
    titulo: 'Firewall IPv6 — Filtro',
    descricao: 'Regras de proteção e encaminhamento IPv6.',
    caminho: 'ipv6/firewall/filter',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['dst-address', 'Destino'],
      ['dst-port', 'Porta'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: camposFirewallBase,
  },
  'ipv6-raw': {
    titulo: 'Firewall IPv6 — RAW',
    descricao: 'Filtragem IPv6 antes do connection tracking.',
    caminho: 'ipv6/firewall/raw',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    ordenar: true,
    colunas: [
      ['chain', 'Chain'],
      ['action', 'Ação'],
      ['protocol', 'Protocolo'],
      ['src-address', 'Origem'],
      ['dst-address', 'Destino'],
      ['disabled', 'Desabilitada'],
      ['comment', 'Comentário'],
    ],
    campos: camposFirewallBase,
  },
  'ipv6-listas': {
    titulo: 'Firewall IPv6 — Listas de endereços',
    descricao: 'Listas reutilizáveis de endereços e prefixos IPv6.',
    caminho: 'ipv6/firewall/address-list',
    criar: true,
    editar: true,
    excluir: true,
    firewall: true,
    colunas: [
      ['list', 'Lista'],
      ['address', 'Endereço'],
      ['timeout', 'Timeout'],
      ['dynamic', 'Dinâmico'],
      ['disabled', 'Desabilitado'],
      ['comment', 'Comentário'],
    ],
    campos: [
      { chave: 'list', rotulo: 'Nome da lista', placeholder: 'permitidos_ipv6', requerido: true },
      { chave: 'address', rotulo: 'IPv6 / prefixo', placeholder: '2001:db8::/32', requerido: true },
      { chave: 'timeout', rotulo: 'Timeout', placeholder: '1d' },
      { chave: 'comment', rotulo: 'Comentário', placeholder: 'Rede autorizada' },
      { chave: 'disabled', rotulo: 'Desabilitado', tipo: 'select', opcoes: opcoesSimNao },
    ],
    mutavel: (registro) => registro.dynamic !== 'true',
  },
};

const estado = {
  secao: 'visao-geral',
  registros: [],
  editando: null,
  acaoConfirmacao: null,
  busca: '',
};

const elementos = {
  carregamento: document.querySelector('#carregamento-inicial'),
  login: document.querySelector('#tela-login'),
  painel: document.querySelector('#painel'),
  formLogin: document.querySelector('#form-login'),
  usuario: document.querySelector('#login-usuario'),
  senha: document.querySelector('#login-senha'),
  botaoLogin: document.querySelector('#botao-login'),
  erroLogin: document.querySelector('#erro-login'),
  titulo: document.querySelector('#titulo-secao'),
  descricao: document.querySelector('#descricao-secao'),
  metricas: document.querySelector('#metricas'),
  areaRecurso: document.querySelector('#area-recurso'),
  cabecalho: document.querySelector('#cabecalho-tabela'),
  corpo: document.querySelector('#corpo-tabela'),
  vazio: document.querySelector('#estado-vazio'),
  busca: document.querySelector('#campo-busca'),
  botaoAdicionar: document.querySelector('#botao-adicionar'),
  botaoAtualizar: document.querySelector('#botao-atualizar'),
  botaoBackup: document.querySelector('#botao-backup'),
  botaoSair: document.querySelector('#botao-sair'),
  pontoStatus: document.querySelector('#ponto-status'),
  textoStatus: document.querySelector('#texto-status'),
  identidadeRouter: document.querySelector('#identidade-router'),
  alerta: document.querySelector('#alerta-global'),
  modalEditor: document.querySelector('#modal-editor'),
  formEditor: document.querySelector('#form-editor'),
  tituloEditor: document.querySelector('#titulo-editor'),
  subtituloEditor: document.querySelector('#subtitulo-editor'),
  camposEditor: document.querySelector('#campos-editor'),
  jsonAvancado: document.querySelector('#json-avancado'),
  fecharEditor: document.querySelector('#fechar-editor'),
  cancelarEditor: document.querySelector('#cancelar-editor'),
  salvarEditor: document.querySelector('#salvar-editor'),
  modalConfirmacao: document.querySelector('#modal-confirmacao'),
  tituloConfirmacao: document.querySelector('#titulo-confirmacao'),
  textoConfirmacao: document.querySelector('#texto-confirmacao'),
  avisoConfirmacao: document.querySelector('#aviso-confirmacao'),
  cancelarConfirmacao: document.querySelector('#cancelar-confirmacao'),
  aceitarConfirmacao: document.querySelector('#aceitar-confirmacao'),
  toasts: document.querySelector('#toasts'),
};

function primeiro(valor) {
  return Array.isArray(valor) ? valor[0] ?? {} : valor ?? {};
}

function booleanoRouterOS(valor) {
  return valor === true || valor === 'true' || valor === 'yes';
}

function escaparBusca(valor) {
  return String(valor ?? '').toLocaleLowerCase('pt-BR');
}

function formatoBytes(valor) {
  let bytes = Number(valor);
  if (!Number.isFinite(bytes)) return valor || '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let indice = 0;
  while (bytes >= 1024 && indice < unidades.length - 1) {
    bytes /= 1024;
    indice += 1;
  }
  return `${bytes.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

function criarBadge(texto, classe = '') {
  const span = document.createElement('span');
  span.className = `badge ${classe}`.trim();
  span.textContent = texto;
  return span;
}

function valorTabela(chave, valor) {
  if (valor === undefined || valor === null || valor === '') return document.createTextNode('—');

  if (['disabled', 'dynamic', 'running', 'complete', 'published', 'fasttrack', 'block-access', 'log', 'passthrough'].includes(chave)) {
    const ativo = booleanoRouterOS(valor);
    if (chave === 'disabled' || chave === 'block-access') {
      return criarBadge(ativo ? 'Sim' : 'Não', ativo ? 'perigo' : 'sucesso');
    }
    return criarBadge(ativo ? 'Sim' : 'Não', ativo ? 'sucesso' : '');
  }

  if (chave === 'status' || chave === 'connection-state') {
    const texto = String(valor);
    const classe = ['bound', 'established'].some((item) => texto.includes(item)) ? 'sucesso' : '';
    return criarBadge(texto, classe);
  }

  if (['mac-address', 'address', 'src-address', 'dst-address'].includes(chave)) {
    const code = document.createElement('code');
    code.textContent = String(valor);
    return code;
  }

  return document.createTextNode(String(valor));
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

  if (resposta.status === 401) {
    mostrarLogin();
  }

  if (!resposta.ok) {
    const erro = new Error(dados?.erro || dados?.message || `Erro HTTP ${resposta.status}.`);
    erro.status = resposta.status;
    erro.dados = dados;
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

function toast(mensagem, tipo = '') {
  const item = document.createElement('div');
  item.className = `toast ${tipo}`.trim();
  item.textContent = mensagem;
  elementos.toasts.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

function definirAlerta(mensagem = '') {
  elementos.alerta.textContent = mensagem;
  elementos.alerta.classList.toggle('oculto', !mensagem);
}

function statusRouter(online, identidade = 'RouterOS') {
  elementos.pontoStatus.classList.toggle('online', online);
  elementos.pontoStatus.classList.toggle('offline', !online);
  elementos.textoStatus.textContent = online ? 'MikroTik online' : 'MikroTik indisponível';
  elementos.identidadeRouter.textContent = identidade || 'RouterOS';
}

function mostrarLogin() {
  elementos.carregamento.classList.add('oculto');
  elementos.painel.classList.add('oculto');
  elementos.login.classList.remove('oculto');
  elementos.senha.value = '';
}

function mostrarPainel() {
  elementos.carregamento.classList.add('oculto');
  elementos.login.classList.add('oculto');
  elementos.painel.classList.remove('oculto');
}

async function verificarSessao() {
  try {
    await requisicaoApi('/api/session');
    mostrarPainel();
    await abrirSecao('visao-geral');
  } catch (erro) {
    if (erro.status !== 401) console.error(erro);
    mostrarLogin();
  }
}

async function entrar(evento) {
  evento.preventDefault();
  elementos.erroLogin.textContent = '';
  elementos.botaoLogin.disabled = true;
  elementos.botaoLogin.textContent = 'Entrando...';

  try {
    await requisicaoApi('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        usuario: elementos.usuario.value.trim(),
        senha: elementos.senha.value,
      }),
    });

    mostrarPainel();
    await abrirSecao('visao-geral');
  } catch (erro) {
    elementos.erroLogin.textContent = erro.message;
  } finally {
    elementos.botaoLogin.disabled = false;
    elementos.botaoLogin.textContent = 'Entrar';
  }
}

async function sair() {
  try {
    await requisicaoApi('/api/logout', { method: 'POST', body: '{}' });
  } catch {
    // A sessão local será descartada visualmente mesmo se a rede falhar.
  }
  mostrarLogin();
}

function limparMetricas() {
  elementos.metricas.replaceChildren();
}

function adicionarMetrica(rotulo, valor, detalhe = '', badge = null) {
  const cartao = document.createElement('article');
  cartao.className = 'metrica';

  const topo = document.createElement('div');
  topo.className = 'metrica-topo';
  const span = document.createElement('span');
  span.textContent = rotulo;
  topo.append(span);
  if (badge) topo.append(criarBadge(badge.texto, badge.classe));

  const forte = document.createElement('strong');
  forte.textContent = String(valor ?? '—');

  const pequeno = document.createElement('small');
  pequeno.textContent = detalhe;

  cartao.append(topo, forte, pequeno);
  elementos.metricas.append(cartao);
}

async function carregarVisaoGeral() {
  estado.secao = 'visao-geral';
  elementos.titulo.textContent = 'Visão geral';
  elementos.descricao.textContent = 'Estado atual do roteador, recursos e regras de rede.';
  elementos.areaRecurso.classList.add('oculto');
  elementos.metricas.classList.remove('oculto');
  limparMetricas();
  definirAlerta('');

  adicionarMetrica('Roteador', 'Carregando...', 'Consultando RouterOS');
  adicionarMetrica('CPU', '—', 'Utilização atual');
  adicionarMetrica('Memória', '—', 'Memória livre');
  adicionarMetrica('DHCP', '—', 'Leases ativos');

  const chamadas = await Promise.allSettled([
    routerOS('system/resource'),
    routerOS('system/identity'),
    routerOS('ip/dhcp-server/lease'),
    routerOS('ip/firewall/filter'),
    routerOS('ip/firewall/nat'),
    routerOS('interface'),
  ]);

  if (chamadas[0].status === 'rejected') {
    limparMetricas();
    statusRouter(false);
    adicionarMetrica('Roteador', 'Offline', 'Não foi possível acessar a REST API', { texto: 'Erro', classe: 'perigo' });
    definirAlerta(`Falha ao acessar o MikroTik: ${chamadas[0].reason.message}`);
    return;
  }

  const recurso = primeiro(chamadas[0].value);
  const identidade = chamadas[1].status === 'fulfilled' ? primeiro(chamadas[1].value) : {};
  const leases = chamadas[2].status === 'fulfilled' && Array.isArray(chamadas[2].value) ? chamadas[2].value : [];
  const filtros = chamadas[3].status === 'fulfilled' && Array.isArray(chamadas[3].value) ? chamadas[3].value : [];
  const nats = chamadas[4].status === 'fulfilled' && Array.isArray(chamadas[4].value) ? chamadas[4].value : [];
  const interfaces = chamadas[5].status === 'fulfilled' && Array.isArray(chamadas[5].value) ? chamadas[5].value : [];

  const nome = identidade.name || recurso['board-name'] || 'MikroTik';
  const livres = Number(recurso['free-memory']);
  const total = Number(recurso['total-memory']);
  const memoriaUsada = Number.isFinite(livres) && Number.isFinite(total) && total > 0
    ? Math.round(((total - livres) / total) * 100)
    : null;
  const leasesAtivos = leases.filter((item) => item.status === 'bound').length;
  const interfacesAtivas = interfaces.filter((item) => booleanoRouterOS(item.running) && !booleanoRouterOS(item.disabled)).length;

  statusRouter(true, `${nome} • RouterOS ${recurso.version ?? ''}`.trim());
  limparMetricas();
  adicionarMetrica('Roteador', nome, recurso['board-name'] || recurso.platform || 'RouterOS', { texto: 'Online', classe: 'sucesso' });
  adicionarMetrica('CPU', `${recurso['cpu-load'] ?? '—'}%`, `${recurso.cpu ?? 'CPU'} • ${recurso['cpu-count'] ?? '—'} núcleo(s)`);
  adicionarMetrica('Memória usada', memoriaUsada === null ? '—' : `${memoriaUsada}%`, `${formatoBytes(recurso['free-memory'])} livres`);
  adicionarMetrica('Uptime', recurso.uptime ?? '—', `RouterOS ${recurso.version ?? '—'}`);
  adicionarMetrica('DHCP ativos', leasesAtivos, `${leases.length} leases conhecidos`);
  adicionarMetrica('Regras de filtro', filtros.length, `${filtros.filter((item) => booleanoRouterOS(item.disabled)).length} desabilitada(s)`);
  adicionarMetrica('Regras NAT', nats.length, `${nats.filter((item) => !booleanoRouterOS(item.disabled)).length} habilitada(s)`);
  adicionarMetrica('Interfaces ativas', interfacesAtivas, `${interfaces.length} interfaces totais`);
}

function atualizarMenu(secao) {
  document.querySelectorAll('.item-menu').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.secao === secao);
  });
}

async function abrirSecao(secao) {
  atualizarMenu(secao);
  estado.busca = '';
  elementos.busca.value = '';

  if (secao === 'visao-geral') {
    await carregarVisaoGeral();
    return;
  }

  const config = recursos[secao];
  if (!config) return;

  estado.secao = secao;
  elementos.titulo.textContent = config.titulo;
  elementos.descricao.textContent = config.descricao;
  elementos.metricas.classList.add('oculto');
  elementos.areaRecurso.classList.remove('oculto');
  elementos.botaoAdicionar.classList.toggle('oculto', !config.criar);
  elementos.botaoAdicionar.disabled = Boolean(config.somenteLeitura);
  definirAlerta(config.firewall ? 'Atenção: alterações no firewall são aplicadas diretamente no roteador e podem interromper o acesso à rede ou ao próprio MikroTik.' : '');

  await carregarRecurso();
}

async function carregarRecurso() {
  const config = recursos[estado.secao];
  if (!config) return;

  elementos.botaoAtualizar.disabled = true;
  elementos.corpo.replaceChildren();
  elementos.vazio.textContent = 'Carregando registros...';
  elementos.vazio.classList.remove('oculto');

  try {
    const dados = await routerOS(config.caminho);
    estado.registros = Array.isArray(dados) ? dados : [dados].filter(Boolean);
    statusRouter(true, elementos.identidadeRouter.textContent);
    renderizarTabela();
  } catch (erro) {
    estado.registros = [];
    elementos.vazio.textContent = `Falha ao carregar: ${erro.message}`;
    elementos.vazio.classList.remove('oculto');
    statusRouter(false, elementos.identidadeRouter.textContent);
    toast(erro.message, 'erro');
  } finally {
    elementos.botaoAtualizar.disabled = false;
  }
}

function registrosFiltrados() {
  const busca = escaparBusca(estado.busca).trim();
  if (!busca) return estado.registros;

  return estado.registros.filter((registro) =>
    Object.values(registro).some((valor) => escaparBusca(valor).includes(busca)),
  );
}

function criarBotaoAcao(texto, aoClicar, { perigo = false, desabilitado = false, titulo = '' } = {}) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `botao pequeno ${perigo ? 'perigo' : 'secundario'}`;
  botao.textContent = texto;
  botao.disabled = desabilitado;
  if (titulo) botao.title = titulo;
  botao.addEventListener('click', aoClicar);
  return botao;
}

function renderizarTabela() {
  const config = recursos[estado.secao];
  if (!config) return;

  elementos.cabecalho.replaceChildren();
  elementos.corpo.replaceChildren();

  const linhaCabecalho = document.createElement('tr');
  config.colunas.forEach(([, rotulo]) => {
    const th = document.createElement('th');
    th.textContent = rotulo;
    linhaCabecalho.append(th);
  });

  const temAcoes = config.editar || config.excluir || config.ordenar || config.acaoEspecial;
  if (temAcoes) {
    const th = document.createElement('th');
    th.textContent = 'Ações';
    linhaCabecalho.append(th);
  }
  elementos.cabecalho.append(linhaCabecalho);

  const filtrados = registrosFiltrados();
  elementos.vazio.classList.toggle('oculto', filtrados.length > 0);
  elementos.vazio.textContent = 'Nenhum registro encontrado.';

  filtrados.forEach((registro) => {
    const indiceReal = estado.registros.indexOf(registro);
    const linha = document.createElement('tr');

    config.colunas.forEach(([chave]) => {
      const td = document.createElement('td');
      if (chave === 'comment') td.classList.add('comentario');
      td.append(valorTabela(chave, registro[chave]));
      linha.append(td);
    });

    if (temAcoes) {
      const td = document.createElement('td');
      const acoes = document.createElement('div');
      acoes.className = 'acoes-registro';
      const mutavel = config.mutavel ? config.mutavel(registro) : true;

      if (config.acaoEspecial === 'dhcp' && registro.dynamic === 'true') {
        acoes.append(criarBotaoAcao('Fixar', () => fixarLease(registro), { titulo: 'Converter lease dinâmico em estático' }));
      }

      if (config.ordenar) {
        acoes.append(
          criarBotaoAcao('↑', () => moverRegra(indiceReal, -1), { desabilitado: indiceReal <= 0, titulo: 'Mover para cima' }),
          criarBotaoAcao('↓', () => moverRegra(indiceReal, 1), { desabilitado: indiceReal >= estado.registros.length - 1, titulo: 'Mover para baixo' }),
        );
      }

      if (config.editar) {
        acoes.append(criarBotaoAcao('Editar', () => abrirEditor(registro), { desabilitado: !mutavel }));
      }

      if (config.excluir) {
        acoes.append(criarBotaoAcao('Excluir', () => excluirRegistro(registro), { perigo: true, desabilitado: !mutavel }));
      }

      td.append(acoes);
      linha.append(td);
    }

    elementos.corpo.append(linha);
  });
}

function criarCampo(definicao, registro) {
  const label = document.createElement('label');
  label.textContent = definicao.rotulo;

  let controle;
  if (definicao.tipo === 'select') {
    controle = document.createElement('select');
    const opcaoVazia = document.createElement('option');
    opcaoVazia.value = '';
    opcaoVazia.textContent = 'Não alterar / padrão';
    controle.append(opcaoVazia);
    (definicao.opcoes ?? []).forEach((opcao) => {
      const item = document.createElement('option');
      item.value = opcao.valor;
      item.textContent = opcao.rotulo;
      controle.append(item);
    });
  } else {
    controle = document.createElement('input');
    controle.type = definicao.tipo || 'text';
    controle.placeholder = definicao.placeholder ?? '';
  }

  controle.name = definicao.chave;
  controle.dataset.chave = definicao.chave;
  controle.required = Boolean(definicao.requerido && !registro);
  controle.value = registro?.[definicao.chave] ?? '';
  label.append(controle);
  return label;
}

function abrirEditor(registro = null) {
  const config = recursos[estado.secao];
  if (!config || (!config.editar && registro) || (!config.criar && !registro)) return;

  estado.editando = registro;
  elementos.camposEditor.replaceChildren();
  elementos.jsonAvancado.value = '';
  elementos.tituloEditor.textContent = registro ? 'Editar registro' : 'Adicionar registro';
  elementos.subtituloEditor.textContent = config.firewall
    ? 'Revise chain, ação, origem, destino e ordem antes de aplicar.'
    : 'Os valores serão enviados diretamente ao RouterOS após validação.';

  config.campos.forEach((campo) => elementos.camposEditor.append(criarCampo(campo, registro)));
  elementos.modalEditor.showModal();
}

function validarMac(mac) {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac);
}

function validarIPv4(ip) {
  const semPrefixo = ip.split('/')[0];
  const partes = semPrefixo.split('.');
  return partes.length === 4 && partes.every((parte) => /^\d{1,3}$/.test(parte) && Number(parte) <= 255);
}

function montarCorpoEditor() {
  const config = recursos[estado.secao];
  const corpo = {};

  elementos.camposEditor.querySelectorAll('[data-chave]').forEach((campo) => {
    const valor = campo.value.trim();
    if (valor !== '') corpo[campo.dataset.chave] = valor;
  });

  const avancadoBruto = elementos.jsonAvancado.value.trim();
  if (avancadoBruto) {
    let avancado;
    try {
      avancado = JSON.parse(avancadoBruto);
    } catch {
      throw new Error('O JSON de parâmetros avançados é inválido.');
    }

    if (!avancado || typeof avancado !== 'object' || Array.isArray(avancado)) {
      throw new Error('Parâmetros avançados precisam ser um objeto JSON.');
    }

    Object.assign(corpo, avancado);
  }

  delete corpo['.id'];
  delete corpo.dynamic;
  delete corpo.status;
  delete corpo.invalid;
  delete corpo.running;

  if (estado.secao === 'dispositivos') {
    if (corpo['mac-address'] && !validarMac(corpo['mac-address'])) {
      throw new Error('MAC inválido. Use o formato AA:BB:CC:DD:EE:FF.');
    }
    if (corpo.address && !validarIPv4(corpo.address)) {
      throw new Error('Endereço IPv4 inválido.');
    }
  }

  if (!Object.keys(corpo).length) {
    throw new Error('Nenhuma alteração foi informada.');
  }

  if (config.firewall && corpo.action === 'drop' && corpo.chain === 'input') {
    corpo.__riscoBloqueioAdministrativo = true;
  }

  return corpo;
}

function confirmar({ titulo, texto, aviso = '', perigo = false }) {
  return new Promise((resolve) => {
    elementos.tituloConfirmacao.textContent = titulo;
    elementos.textoConfirmacao.textContent = texto;
    elementos.avisoConfirmacao.textContent = aviso;
    elementos.avisoConfirmacao.classList.toggle('oculto', !aviso);
    elementos.aceitarConfirmacao.classList.toggle('perigo', perigo);
    elementos.aceitarConfirmacao.classList.toggle('primario', !perigo);
    elementos.modalConfirmacao.showModal();

    const finalizar = (resultado) => {
      elementos.aceitarConfirmacao.onclick = null;
      elementos.cancelarConfirmacao.onclick = null;
      elementos.modalConfirmacao.close();
      resolve(resultado);
    };

    elementos.aceitarConfirmacao.onclick = () => finalizar(true);
    elementos.cancelarConfirmacao.onclick = () => finalizar(false);
  });
}

async function salvarEditor(evento) {
  evento.preventDefault();
  const config = recursos[estado.secao];
  if (!config) return;

  try {
    const corpo = montarCorpoEditor();
    const riscoAdministrativo = Boolean(corpo.__riscoBloqueioAdministrativo);
    delete corpo.__riscoBloqueioAdministrativo;

    if (config.firewall) {
      const aceito = await confirmar({
        titulo: estado.editando ? 'Aplicar alteração no firewall?' : 'Adicionar regra ao firewall?',
        texto: 'A alteração entra em vigor imediatamente no MikroTik.',
        aviso: riscoAdministrativo
          ? 'Regra DROP na chain INPUT: uma condição incorreta pode bloquear seu acesso ao próprio roteador.'
          : 'Confirme que origem, destino, chain e ação estão corretos. A ordem das regras também altera o resultado.',
        perigo: true,
      });
      if (!aceito) return;
    }

    elementos.salvarEditor.disabled = true;
    elementos.salvarEditor.textContent = 'Salvando...';

    const id = estado.editando?.['.id'];
    const caminho = id ? `${config.caminho}/${id}` : config.caminho;
    const metodo = id ? 'PATCH' : 'PUT';

    await routerOS(caminho, {
      metodo,
      corpo,
      risco: Boolean(config.firewall),
    });

    elementos.modalEditor.close();
    toast('Configuração salva no MikroTik.', 'sucesso');
    await carregarRecurso();
  } catch (erro) {
    toast(erro.message, 'erro');
  } finally {
    elementos.salvarEditor.disabled = false;
    elementos.salvarEditor.textContent = 'Salvar alterações';
  }
}

async function excluirRegistro(registro) {
  const config = recursos[estado.secao];
  const id = registro['.id'];
  if (!config || !id) return;

  const aceito = await confirmar({
    titulo: 'Excluir registro?',
    texto: config.firewall
      ? 'A regra será removida imediatamente do firewall.'
      : 'O registro será removido da configuração do MikroTik.',
    aviso: config.firewall
      ? 'Excluir uma regra ACCEPT ou alterar a ordem lógica do firewall pode interromper tráfego legítimo ou acesso administrativo.'
      : '',
    perigo: true,
  });
  if (!aceito) return;

  try {
    await routerOS(`${config.caminho}/${id}`, {
      metodo: 'DELETE',
      risco: Boolean(config.firewall),
    });
    toast('Registro excluído.', 'sucesso');
    await carregarRecurso();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
}

async function fixarLease(registro) {
  const id = registro['.id'];
  if (!id) return;

  const aceito = await confirmar({
    titulo: 'Fixar IP pelo MAC?',
    texto: `O lease ${registro['mac-address'] ?? ''} → ${registro.address ?? ''} será convertido em estático.`,
    aviso: 'Depois de fixado, você poderá editar o IP, bloquear o cliente e configurar limite de banda.',
  });
  if (!aceito) return;

  try {
    await routerOS('ip/dhcp-server/lease/make-static', {
      metodo: 'POST',
      corpo: { numbers: id },
    });
    toast('Lease convertido em estático.', 'sucesso');
    await carregarRecurso();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
}

async function moverRegra(indice, direcao) {
  const config = recursos[estado.secao];
  if (!config?.ordenar) return;

  const atual = estado.registros[indice];
  const alvo = estado.registros[indice + direcao];
  if (!atual?.['.id'] || !alvo?.['.id']) return;

  const aceito = await confirmar({
    titulo: 'Alterar ordem do firewall?',
    texto: 'O RouterOS processa regras de cima para baixo; mover uma regra pode mudar imediatamente o tráfego permitido ou bloqueado.',
    aviso: 'Revise principalmente regras DROP/REJECT e regras da chain INPUT.',
    perigo: true,
  });
  if (!aceito) return;

  try {
    const corpo = direcao < 0
      ? { numbers: atual['.id'], destination: alvo['.id'] }
      : { numbers: alvo['.id'], destination: atual['.id'] };

    await routerOS(`${config.caminho}/move`, {
      metodo: 'POST',
      corpo,
      risco: true,
    });

    toast('Ordem das regras atualizada.', 'sucesso');
    await carregarRecurso();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
}

async function baixarBackup() {
  elementos.botaoBackup.disabled = true;
  elementos.botaoBackup.textContent = 'Gerando...';

  try {
    const dados = await requisicaoApi('/api/backup');
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const data = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `mikrotik-backup-${data}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Backup JSON gerado.', 'sucesso');
  } catch (erro) {
    toast(erro.message, 'erro');
  } finally {
    elementos.botaoBackup.disabled = false;
    elementos.botaoBackup.textContent = 'Baixar backup JSON';
  }
}

function registrarEventos() {
  elementos.formLogin.addEventListener('submit', entrar);
  elementos.botaoSair.addEventListener('click', sair);
  elementos.botaoBackup.addEventListener('click', baixarBackup);
  elementos.botaoAtualizar.addEventListener('click', carregarRecurso);
  elementos.botaoAdicionar.addEventListener('click', () => abrirEditor(null));
  elementos.formEditor.addEventListener('submit', salvarEditor);
  elementos.fecharEditor.addEventListener('click', () => elementos.modalEditor.close());
  elementos.cancelarEditor.addEventListener('click', () => elementos.modalEditor.close());
  elementos.busca.addEventListener('input', (evento) => {
    estado.busca = evento.target.value;
    renderizarTabela();
  });

  document.querySelectorAll('.item-menu').forEach((botao) => {
    botao.addEventListener('click', () => abrirSecao(botao.dataset.secao));
  });

  elementos.modalEditor.addEventListener('cancel', () => {
    estado.editando = null;
  });
}

registrarEventos();
verificarSessao();
