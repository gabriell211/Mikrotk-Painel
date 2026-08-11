import { requisitarRouterOS } from './_lib/routeros.js';
import { exigirSessao, semCache } from './_lib/seguranca.js';

const SECOES = {
  identidade: 'system/identity',
  recursos: 'system/resource',
  interfaces: 'interface',
  vlans: 'interface/vlan',
  enderecosIp: 'ip/address',
  arp: 'ip/arp',
  dhcpLeases: 'ip/dhcp-server/lease',
  firewallFiltro: 'ip/firewall/filter',
  firewallNat: 'ip/firewall/nat',
  firewallMangle: 'ip/firewall/mangle',
  firewallRaw: 'ip/firewall/raw',
  firewallListas: 'ip/firewall/address-list',
  firewallConexoes: 'ip/firewall/connection',
  firewallRastreamento: 'ip/firewall/connection/tracking',
  firewallCamada7: 'ip/firewall/layer7-protocol',
  firewallServicos: 'ip/firewall/service-port',
  firewallIpv6Filtro: 'ipv6/firewall/filter',
  firewallIpv6Nat: 'ipv6/firewall/nat',
  firewallIpv6Raw: 'ipv6/firewall/raw',
  firewallIpv6Listas: 'ipv6/firewall/address-list',
  firewallIpv6Conexoes: 'ipv6/firewall/connection',
};

export default async function handler(req, res) {
  semCache(res);

  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const entradas = Object.entries(SECOES);
  const resultados = await Promise.allSettled(
    entradas.map(([, caminho]) => requisitarRouterOS(caminho, { metodo: 'GET' })),
  );

  const dados = {};
  const falhas = {};

  resultados.forEach((resultado, indice) => {
    const [nome] = entradas[indice];

    if (resultado.status === 'fulfilled') {
      dados[nome] = resultado.value;
    } else {
      falhas[nome] = resultado.reason?.message ?? 'Falha desconhecida.';
    }
  });

  return res.status(200).json({
    formato: 'mikrotk-painel-backup-v1',
    geradoEm: new Date().toISOString(),
    dados,
    falhas,
  });
}
