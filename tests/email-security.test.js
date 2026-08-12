import assert from 'node:assert/strict';
import test from 'node:test';
import {
  avaliarRegistrosEmail,
  normalizarDominio,
  normalizarSeletor,
} from '../api/_lib/email-security.js';

test('normaliza domínio e seletor DKIM', () => {
  assert.equal(normalizarDominio(' Empresa.COM.BR. '), 'empresa.com.br');
  assert.equal(normalizarSeletor(' Selector_01 '), 'selector_01');
});

test('rejeita domínio com protocolo ou caminho', () => {
  assert.throws(() => normalizarDominio('https://empresa.com'));
  assert.throws(() => normalizarDominio('empresa.com/login'));
});

test('avalia SPF DKIM e DMARC fortes', () => {
  const resultado = avaliarRegistrosEmail({
    dominio: 'empresa.com',
    seletor: 'selector1',
    spf: [['v=spf1 include:_spf.exemplo.com -all']],
    dmarc: [['v=DMARC1; p=reject; rua=mailto:dmarc@empresa.com']],
    dkim: [['v=DKIM1; k=rsa; p=ABC123']],
  });

  assert.equal(resultado.spf.configurado, true);
  assert.equal(resultado.spf.duplicado, false);
  assert.equal(resultado.dkim.configurado, true);
  assert.equal(resultado.dmarc.forte, true);
  assert.equal(resultado.pontuacao, 100);
});

test('marca SPF duplicado e DMARC p=none como configuração fraca', () => {
  const resultado = avaliarRegistrosEmail({
    dominio: 'empresa.com',
    seletor: 'default',
    spf: [['v=spf1 -all'], ['v=spf1 include:outro.example -all']],
    dmarc: [['v=DMARC1; p=none']],
    dkim: [],
  });

  assert.equal(resultado.spf.duplicado, true);
  assert.equal(resultado.dmarc.forte, false);
  assert.equal(resultado.dkim.configurado, false);
  assert.equal(resultado.pontuacao, 20);
});
