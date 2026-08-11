import assert from 'node:assert/strict';
import test from 'node:test';
import {
  criarTokenSessao,
  validarCredenciais,
  validarSessao,
} from '../api/_lib/seguranca.js';

const segredoAnterior = process.env.SESSION_SECRET;
const usuarioAnterior = process.env.PAINEL_USUARIO;
const senhaAnterior = process.env.PAINEL_SENHA;

process.env.SESSION_SECRET = '12345678901234567890123456789012-segredo-testes';
process.env.PAINEL_USUARIO = 'admin-teste';
process.env.PAINEL_SENHA = 'senha-forte-teste';

test.after(() => {
  if (segredoAnterior === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = segredoAnterior;

  if (usuarioAnterior === undefined) delete process.env.PAINEL_USUARIO;
  else process.env.PAINEL_USUARIO = usuarioAnterior;

  if (senhaAnterior === undefined) delete process.env.PAINEL_SENHA;
  else process.env.PAINEL_SENHA = senhaAnterior;
});

test('valida credenciais corretas', () => {
  assert.equal(validarCredenciais('admin-teste', 'senha-forte-teste'), true);
});

test('rejeita credenciais incorretas', () => {
  assert.equal(validarCredenciais('admin-teste', 'senha-errada'), false);
});

test('gera e valida sessão assinada', () => {
  const token = criarTokenSessao('admin-teste');
  const req = { headers: { cookie: `mikrotk_sessao=${encodeURIComponent(token)}` } };
  const sessao = validarSessao(req);

  assert.equal(sessao.usuario, 'admin-teste');
  assert.ok(sessao.expiraEm > Math.floor(Date.now() / 1000));
});

test('rejeita sessão adulterada', () => {
  const token = criarTokenSessao('admin-teste');
  const adulterado = `${token}x`;
  const req = { headers: { cookie: `mikrotk_sessao=${encodeURIComponent(adulterado)}` } };

  assert.equal(validarSessao(req), null);
});
