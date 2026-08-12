const elementosHydra = {
  menuSmtp: document.querySelector('[data-secao="smtp"]'),
  titulo: document.querySelector('#titulo-secao'),
  descricao: document.querySelector('#descricao-secao'),
  metricas: document.querySelector('#metricas'),
  areaRecurso: document.querySelector('#area-recurso'),
  areaSmtp: document.querySelector('#area-smtp'),
  alerta: document.querySelector('#alerta-global'),
  status: document.querySelector('#smtp-status'),
  formConfig: document.querySelector('#form-smtp-config'),
  formTeste: document.querySelector('#form-smtp-teste'),
  address: document.querySelector('#smtp-address'),
  port: document.querySelector('#smtp-port'),
  from: document.querySelector('#smtp-from'),
  user: document.querySelector('#smtp-user'),
  password: document.querySelector('#smtp-password'),
  tls: document.querySelector('#smtp-tls'),
  certificate: document.querySelector('#smtp-certificate'),
  vrf: document.querySelector('#smtp-vrf'),
  recarregar: document.querySelector('#smtp-recarregar'),
  salvar: document.querySelector('#smtp-salvar'),
  testTo: document.querySelector('#smtp-test-to'),
  testSubject: document.querySelector('#smtp-test-subject'),
  testBody: document.querySelector('#smtp-test-body'),
  testar: document.querySelector('#smtp-testar'),
  firewallDestino: document.querySelector('#smtp-firewall-destino'),
  permitirSeguro: document.querySelector('#smtp-permitir-seguro'),
  protegerPorta25: document.querySelector('#smtp-proteger-porta25'),
  modalConfirmacao: document.querySelector('#modal-confirmacao'),
  tituloConfirmacao: document.querySelector('#titulo-confirmacao'),
  textoConfirmacao: document.querySelector('#texto-confirmacao'),
  avisoConfirmacao: document.querySelector('#aviso-confirmacao'),
  cancelarConfirmacao: document.querySelector('#cancelar-confirmacao'),
  aceitarConfirmacao: document.querySelector('#aceitar-confirmacao'),
  toasts: document.querySelector('#toasts'),
};

function toastHydra(mensagem, tipo = '') {
  const item = document.createElement('div');
  item.className = `toast ${tipo}`.trim();
  item.textContent = mensagem;
  elementosHydra.toasts?.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

function definirStatus(texto, erro = false) {
  if (!elementosHydra.status) return;
  elementosHydra.status.textContent = texto;
  elementosHydra.status.classList.toggle('erro', erro);
}

async function requisicaoApiHydra(url, opcoes = {}) {
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
    erro.dados = dados;
    throw erro;
  }

  return dados;
}

async function routerOSHydra(caminho, { metodo = 'GET', corpo, parametros, risco = false } = {}) {
  const query = new URLSearchParams({ path: caminho });
  if (parametros && Object.keys(parametros).length) {
    query.set('parametros', JSON.stringify(parametros));
  }

  const headers = {};
  if (risco) headers['X-Confirmacao-Risco'] = 'APLICAR';

  return requisicaoApiHydra(`/api/routeros?${query.toString()}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

function primeiro(valor) {
  return Array.isArray(valor) ? valor[0] ?? {} : valor ?? {};
}

function preencherSelect(select, valor, fallback) {
  const escolhido = valor || fallback;
  if ([...select.options].some((opcao) => opcao.value === escolhido)) {
    select.value = escolhido;
  } else {
    select.value = fallback;
  }
}

async function carregarSmtp() {
  definirStatus('Consultando RouterOS...');
  elementosHydra.recarregar.disabled = true;

  try {
    const dados = await routerOSHydra('tool/e-mail', {
      parametros: {
        '.proplist': 'address,server,port,from,user,tls,certificate-verification,vrf',
      },
    });
    const config = primeiro(dados);

    elementosHydra.address.value = config.address || config.server || '';
    elementosHydra.port.value = config.port || '587';
    elementosHydra.from.value = config.from || '';
    elementosHydra.user.value = config.user || '';
    elementosHydra.password.value = '';
    elementosHydra.vrf.value = config.vrf || 'main';
    preencherSelect(elementosHydra.tls, config.tls, 'starttls');
    preencherSelect(elementosHydra.certificate, config['certificate-verification'], 'yes');

    const servidor = elementosHydra.address.value || 'não configurado';
    definirStatus(`SMTP: ${servidor}`);
  } catch (erro) {
    definirStatus('SMTP indisponível', true);
    toastHydra(`Falha ao consultar SMTP: ${erro.message}`, 'erro');
  } finally {
    elementosHydra.recarregar.disabled = false;
  }
}

function abrirSmtp() {
  elementosHydra.metricas?.classList.add('oculto');
  elementosHydra.areaRecurso?.classList.add('oculto');
  elementosHydra.areaSmtp?.classList.remove('oculto');
  elementosHydra.alerta?.classList.add('oculto');
  if (elementosHydra.alerta) elementosHydra.alerta.textContent = '';

  elementosHydra.titulo.textContent = 'SMTP / E-mail';
  elementosHydra.descricao.textContent = 'Configuração do cliente SMTP do RouterOS, teste de envio e proteção de tráfego de e-mail.';

  carregarSmtp();
}

function esconderSmtp() {
  elementosHydra.areaSmtp?.classList.add('oculto');
}

function corpoConfiguracaoSmtp() {
  const porta = Number(elementosHydra.port.value);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('Porta SMTP inválida. Use um valor entre 1 e 65535.');
  }

  const address = elementosHydra.address.value.trim();
  if (!address) throw new Error('Informe o servidor SMTP.');

  const corpo = {
    address,
    port: String(porta),
    from: elementosHydra.from.value.trim(),
    user: elementosHydra.user.value.trim(),
    tls: elementosHydra.tls.value,
    'certificate-verification': elementosHydra.certificate.value,
    vrf: elementosHydra.vrf.value.trim() || 'main',
  };

  const senha = elementosHydra.password.value;
  if (senha) corpo.password = senha;

  return corpo;
}

async function salvarSmtp(evento) {
  evento.preventDefault();
  elementosHydra.salvar.disabled = true;
  elementosHydra.salvar.textContent = 'Salvando...';

  try {
    const corpo = corpoConfiguracaoSmtp();
    await routerOSHydra('tool/e-mail/set', {
      metodo: 'POST',
      corpo,
    });
    elementosHydra.password.value = '';
    toastHydra('Configuração SMTP salva no MikroTik.', 'sucesso');
    await carregarSmtp();
  } catch (erro) {
    toastHydra(erro.message, 'erro');
  } finally {
    elementosHydra.salvar.disabled = false;
    elementosHydra.salvar.textContent = 'Salvar SMTP';
  }
}

async function testarSmtp(evento) {
  evento.preventDefault();
  elementosHydra.testar.disabled = true;
  elementosHydra.testar.textContent = 'Enviando...';

  try {
    const to = elementosHydra.testTo.value.trim();
    const subject = elementosHydra.testSubject.value.trim();
    const body = elementosHydra.testBody.value.trim();

    if (!to || !subject) throw new Error('Destinatário e assunto são obrigatórios.');

    await routerOSHydra('tool/e-mail/send', {
      metodo: 'POST',
      corpo: { to, subject, body },
    });

    toastHydra('E-mail de teste enviado pelo RouterOS.', 'sucesso');
  } catch (erro) {
    toastHydra(`Falha no teste SMTP: ${erro.message}`, 'erro');
  } finally {
    elementosHydra.testar.disabled = false;
    elementosHydra.testar.textContent = 'Enviar teste';
  }
}

function validarIPv4(ip) {
  const partes = ip.split('.');
  return partes.length === 4 && partes.every((parte) => /^\d{1,3}$/.test(parte) && Number(parte) <= 255);
}

function validarIPv4OuRede(valor) {
  const [ip, prefixo, ...resto] = valor.split('/');
  if (resto.length || !validarIPv4(ip)) return false;
  if (prefixo === undefined) return true;
  return /^\d{1,2}$/.test(prefixo) && Number(prefixo) >= 0 && Number(prefixo) <= 32;
}

function confirmarHydra({ titulo, texto, aviso }) {
  return new Promise((resolve) => {
    elementosHydra.tituloConfirmacao.textContent = titulo;
    elementosHydra.textoConfirmacao.textContent = texto;
    elementosHydra.avisoConfirmacao.textContent = aviso || '';
    elementosHydra.avisoConfirmacao.classList.toggle('oculto', !aviso);
    elementosHydra.aceitarConfirmacao.classList.add('perigo');
    elementosHydra.aceitarConfirmacao.classList.remove('primario');
    elementosHydra.modalConfirmacao.showModal();

    const concluir = (resultado) => {
      elementosHydra.aceitarConfirmacao.onclick = null;
      elementosHydra.cancelarConfirmacao.onclick = null;
      elementosHydra.modalConfirmacao.close();
      resolve(resultado);
    };

    elementosHydra.aceitarConfirmacao.onclick = () => concluir(true);
    elementosHydra.cancelarConfirmacao.onclick = () => concluir(false);
  });
}

async function regrasFirewall() {
  const dados = await routerOSHydra('ip/firewall/filter');
  return Array.isArray(dados) ? dados : [];
}

async function garantirRegraFirewall(regra, registrosAtuais) {
  if (registrosAtuais.some((item) => item.comment === regra.comment)) return false;

  await routerOSHydra('ip/firewall/filter', {
    metodo: 'PUT',
    corpo: regra,
    risco: true,
  });
  return true;
}

async function permitirSmtpSeguro() {
  const destino = elementosHydra.firewallDestino.value.trim();
  if (!destino || !validarIPv4OuRede(destino)) {
    toastHydra('Informe um IP ou rede IPv4 válido para o servidor SMTP autorizado.', 'erro');
    return;
  }

  const aceito = await confirmarHydra({
    titulo: 'Permitir SMTP seguro?',
    texto: `Será criada uma regra ACCEPT para TCP 465/587 com destino ${destino}.`,
    aviso: 'A regra será adicionada ao final da chain forward. Revise a ordem caso exista uma regra DROP anterior.',
  });
  if (!aceito) return;

  elementosHydra.permitirSeguro.disabled = true;
  try {
    const registros = await regrasFirewall();
    const criada = await garantirRegraFirewall({
      chain: 'forward',
      action: 'accept',
      protocol: 'tcp',
      'dst-address': destino,
      'dst-port': '465,587',
      comment: `HYDRA | SMTP seguro ${destino}`,
    }, registros);

    toastHydra(criada ? 'Regra SMTP 465/587 criada.' : 'Essa regra SMTP já existe.', 'sucesso');
  } catch (erro) {
    toastHydra(`Falha ao aplicar regra SMTP: ${erro.message}`, 'erro');
  } finally {
    elementosHydra.permitirSeguro.disabled = false;
  }
}

async function protegerPorta25() {
  const destino = elementosHydra.firewallDestino.value.trim();
  if (destino && !validarIPv4OuRede(destino)) {
    toastHydra('O servidor autorizado precisa ser um IP ou rede IPv4 válido.', 'erro');
    return;
  }

  const aceito = await confirmarHydra({
    titulo: 'Proteger SMTP na porta 25?',
    texto: destino
      ? `A HYDRA permitirá TCP/25 somente para ${destino} e bloqueará os demais destinos.`
      : 'A HYDRA bloqueará novas conexões encaminhadas para TCP/25.',
    aviso: 'Esta alteração pode impedir clientes ou servidores que ainda dependam de SMTP TCP/25. As regras serão adicionadas ao final da chain forward.',
  });
  if (!aceito) return;

  elementosHydra.protegerPorta25.disabled = true;
  try {
    const registros = await regrasFirewall();
    let criadas = 0;

    if (destino) {
      const criadaAllow = await garantirRegraFirewall({
        chain: 'forward',
        action: 'accept',
        protocol: 'tcp',
        'dst-address': destino,
        'dst-port': '25',
        comment: `HYDRA | SMTP 25 autorizado ${destino}`,
      }, registros);
      if (criadaAllow) {
        criadas += 1;
        registros.push({ comment: `HYDRA | SMTP 25 autorizado ${destino}` });
      }
    }

    const criadaDrop = await garantirRegraFirewall({
      chain: 'forward',
      action: 'drop',
      protocol: 'tcp',
      'dst-port': '25',
      comment: 'HYDRA | Bloqueio SMTP 25',
    }, registros);
    if (criadaDrop) criadas += 1;

    toastHydra(
      criadas > 0 ? `${criadas} regra(s) de proteção SMTP aplicada(s).` : 'A proteção SMTP já estava configurada.',
      'sucesso',
    );
  } catch (erro) {
    toastHydra(`Falha ao proteger SMTP: ${erro.message}`, 'erro');
  } finally {
    elementosHydra.protegerPorta25.disabled = false;
  }
}

function registrarEventosHydra() {
  if (!elementosHydra.menuSmtp || !elementosHydra.areaSmtp) return;

  elementosHydra.menuSmtp.addEventListener('click', abrirSmtp);

  document.querySelectorAll('.item-menu').forEach((botao) => {
    if (botao.dataset.secao !== 'smtp') {
      botao.addEventListener('click', esconderSmtp);
    }
  });

  elementosHydra.formConfig.addEventListener('submit', salvarSmtp);
  elementosHydra.formTeste.addEventListener('submit', testarSmtp);
  elementosHydra.recarregar.addEventListener('click', carregarSmtp);
  elementosHydra.permitirSeguro.addEventListener('click', permitirSmtpSeguro);
  elementosHydra.protegerPorta25.addEventListener('click', protegerPorta25);
}

registrarEventosHydra();
