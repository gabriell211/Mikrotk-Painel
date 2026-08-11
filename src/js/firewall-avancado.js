const elementos = {
  recurso: document.querySelector('#recurso-avancado'),
  metodo: document.querySelector('#metodo-avancado'),
  id: document.querySelector('#id-registro'),
  corpo: document.querySelector('#corpo-json'),
  executar: document.querySelector('#executar-avancado'),
  limpar: document.querySelector('#limpar-avancado'),
  resposta: document.querySelector('#resposta-avancada'),
  selecionar: document.querySelector('#copiar-resposta'),
  toasts: document.querySelector('#toasts'),
};

function toast(mensagem, tipo = '') {
  const item = document.createElement('div');
  item.className = `toast ${tipo}`.trim();
  item.textContent = mensagem;
  elementos.toasts.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

async function validarSessao() {
  const resposta = await fetch('/api/session', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (!resposta.ok) {
    window.location.replace('/');
    return false;
  }

  return true;
}

function montarCaminho() {
  const recurso = elementos.recurso.value;
  const metodo = elementos.metodo.value;
  const id = elementos.id.value.trim();

  if (['PATCH', 'DELETE'].includes(metodo)) {
    if (!/^\*[A-Za-z0-9]+$/.test(id)) {
      throw new Error('Informe um ID RouterOS válido, por exemplo *A.');
    }
    return `${recurso}/${id}`;
  }

  return recurso;
}

function lerCorpo() {
  const metodo = elementos.metodo.value;
  if (!['PUT', 'PATCH'].includes(metodo)) return undefined;

  const texto = elementos.corpo.value.trim();
  if (!texto) {
    throw new Error('Informe um objeto JSON para criar ou alterar o registro.');
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error('O corpo JSON é inválido.');
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('O corpo precisa ser um objeto JSON.');
  }

  delete dados['.id'];
  delete dados.dynamic;
  delete dados.invalid;
  delete dados.running;
  delete dados.status;

  return dados;
}

async function executar() {
  try {
    const metodo = elementos.metodo.value;
    const caminho = montarCaminho();
    const corpo = lerCorpo();

    if (metodo !== 'GET') {
      const aceito = window.confirm(
        'Esta alteração será aplicada imediatamente no firewall do MikroTik. Uma regra incorreta pode interromper seu acesso. Deseja continuar?',
      );
      if (!aceito) return;
    }

    elementos.executar.disabled = true;
    elementos.executar.textContent = 'Executando...';
    elementos.resposta.textContent = 'Consultando RouterOS...';

    const query = new URLSearchParams({ path: caminho });
    const resposta = await fetch(`/api/routeros?${query.toString()}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(metodo !== 'GET' ? {
          'Content-Type': 'application/json',
          'X-Confirmacao-Risco': 'APLICAR',
        } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

    const tipo = resposta.headers.get('content-type') ?? '';
    const dados = tipo.includes('application/json') ? await resposta.json() : await resposta.text();

    if (resposta.status === 401) {
      window.location.replace('/');
      return;
    }

    elementos.resposta.textContent = typeof dados === 'string'
      ? dados
      : JSON.stringify(dados, null, 2);

    if (!resposta.ok) {
      throw new Error(dados?.erro || `Erro HTTP ${resposta.status}.`);
    }

    toast(metodo === 'GET' ? 'Consulta concluída.' : 'Alteração aplicada no RouterOS.', 'sucesso');
  } catch (erro) {
    elementos.resposta.textContent = JSON.stringify({ erro: erro.message }, null, 2);
    toast(erro.message, 'erro');
  } finally {
    elementos.executar.disabled = false;
    elementos.executar.textContent = 'Executar';
  }
}

function limpar() {
  elementos.id.value = '';
  elementos.corpo.value = '';
  elementos.resposta.textContent = 'Selecione um recurso e clique em Executar.';
}

function selecionarResposta() {
  const selecao = window.getSelection();
  const intervalo = document.createRange();
  intervalo.selectNodeContents(elementos.resposta);
  selecao.removeAllRanges();
  selecao.addRange(intervalo);
  toast('Resposta selecionada.');
}

function sincronizarFormulario() {
  const metodo = elementos.metodo.value;
  elementos.id.disabled = !['PATCH', 'DELETE'].includes(metodo);
  elementos.corpo.disabled = !['PUT', 'PATCH'].includes(metodo);
}

elementos.executar.addEventListener('click', executar);
elementos.limpar.addEventListener('click', limpar);
elementos.selecionar.addEventListener('click', selecionarResposta);
elementos.metodo.addEventListener('change', sincronizarFormulario);

sincronizarFormulario();
validarSessao();
