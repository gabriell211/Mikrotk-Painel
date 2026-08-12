import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizarCaminho,
  validarAcessoRecurso,
} from '../api/_lib/routeros.js';

test('permite leitura das regras de filtro', () => {
  const resultado = validarAcessoRecurso('ip/firewall/filter', 'GET');
  assert.equal(resultado.permitido, true);
});

test('permite alteração de uma regra específica', () => {
  const resultado = validarAcessoRecurso('ip/firewall/filter/*A', 'PATCH');
  assert.equal(resultado.permitido, true);
});

test('permite reordenar regras do firewall', () => {
  const resultado = validarAcessoRecurso('ip/firewall/filter/move', 'POST');
  assert.equal(resultado.permitido, true);
});

test('permite converter lease DHCP em estático', () => {
  const resultado = validarAcessoRecurso('ip/dhcp-server/lease/make-static', 'POST');
  assert.equal(resultado.permitido, true);
});

test('permite consultar configuração SMTP', () => {
  const resultado = validarAcessoRecurso('tool/e-mail', 'GET');
  assert.equal(resultado.permitido, true);
});

test('permite salvar configuração SMTP pelo comando set', () => {
  const resultado = validarAcessoRecurso('tool/e-mail/set', 'POST');
  assert.equal(resultado.permitido, true);
});

test('permite envio SMTP pelo comando send', () => {
  const resultado = validarAcessoRecurso('tool/e-mail/send', 'POST');
  assert.equal(resultado.permitido, true);
});

test('bloqueia leitura direta do comando SMTP send', () => {
  const resultado = validarAcessoRecurso('tool/e-mail/send', 'GET');
  assert.equal(resultado.permitido, false);
});

test('bloqueia comando SMTP não explicitamente permitido', () => {
  const resultado = validarAcessoRecurso('tool/e-mail/fetch', 'POST');
  assert.equal(resultado.permitido, false);
});

test('bloqueia mutação direta na raiz SMTP', () => {
  const resultado = validarAcessoRecurso('tool/e-mail', 'PUT');
  assert.equal(resultado.permitido, false);
});

test('bloqueia POST arbitrário mesmo dentro de um recurso permitido', () => {
  const resultado = validarAcessoRecurso('ip/firewall/filter/reset-counters-all', 'POST');
  assert.equal(resultado.permitido, false);
});

test('bloqueia execução arbitrária de scripts', () => {
  const resultado = validarAcessoRecurso('execute', 'POST');
  assert.equal(resultado.permitido, false);
});

test('bloqueia acesso a system script', () => {
  const resultado = validarAcessoRecurso('system/script/run', 'POST');
  assert.equal(resultado.permitido, false);
});

test('bloqueia path traversal', () => {
  assert.throws(() => normalizarCaminho('ip/firewall/filter/../../system/script'));
});

test('modo somente leitura bloqueia mutações', () => {
  const anterior = process.env.PAINEL_MODO_SOMENTE_LEITURA;
  process.env.PAINEL_MODO_SOMENTE_LEITURA = 'true';

  const resultado = validarAcessoRecurso('ip/firewall/filter/*A', 'PATCH');
  assert.equal(resultado.permitido, false);

  if (anterior === undefined) delete process.env.PAINEL_MODO_SOMENTE_LEITURA;
  else process.env.PAINEL_MODO_SOMENTE_LEITURA = anterior;
});
