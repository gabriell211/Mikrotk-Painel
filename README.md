# MikroTik Painel

Painel administrativo em **HTML + CSS + JavaScript puro**, com **Vercel Functions** no backend para gerenciar um MikroTik RouterOS sem expor as credenciais do roteador no navegador.

## Objetivo

Centralizar a administração da rede em uma interface web em PT-BR, começando pela amarração `MAC → IP` e evoluindo para controle completo das principais áreas de firewall e rede do RouterOS.

## Recursos implementados

### Visão geral

- identidade do roteador;
- modelo/board;
- versão do RouterOS;
- uptime;
- carga de CPU;
- memória;
- leases DHCP ativos;
- quantidade de regras de filtro/NAT;
- interfaces em execução.

### Dispositivos / DHCP

- listar leases;
- pesquisar por IP, MAC, hostname, servidor ou comentário;
- criar lease estático;
- converter lease dinâmico em estático;
- editar IP associado ao MAC;
- impedir IP duplicado;
- impedir MAC duplicado;
- bloquear/liberar cliente com `block-access`;
- configurar `rate-limit`;
- associar lease a address-list;
- remover lease estático.

### ARP

- listar tabela ARP;
- criar entrada estática;
- editar entrada estática;
- remover entrada estática;
- identificar entradas dinâmicas.

### Rede

- interfaces;
- ativar/desativar interfaces;
- comentários administrativos;
- VLANs;
- endereços IPv4.

### Firewall IPv4

- Filter;
- NAT;
- Mangle;
- RAW;
- Address Lists;
- Connection Tracking / conexões;
- Service Ports;
- suporte backend para Layer7 Protocol.

### Firewall IPv6

- Filter;
- NAT suportado pelo backend;
- RAW;
- Address Lists;
- conexões suportadas pelo backend.

### Administração avançada

Os formulários de firewall possuem um campo **Parâmetros avançados (JSON)**. Isso permite enviar propriedades específicas do RouterOS que não possuem um campo visual dedicado, sem limitar regras avançadas como:

- `connection-state`;
- `src-address-list`;
- `dst-address-list`;
- `in-interface-list`;
- `out-interface-list`;
- `tcp-flags`;
- `tls-host`;
- `connection-mark`;
- `packet-mark`;
- `routing-mark`;
- `limit`;
- `dst-limit`;
- `ipsec-policy`;
- demais parâmetros aceitos pelo recurso correspondente no RouterOS.

## Segurança

O navegador **nunca recebe** usuário e senha do MikroTik.

Fluxo:

```text
Navegador
   ↓
Painel Vanilla JS
   ↓
Vercel Function /api/routeros
   ↓
HTTPS / túnel seguro
   ↓
RouterOS REST API
```

Proteções existentes:

- login próprio do painel;
- sessão assinada com HMAC SHA-256;
- cookie `HttpOnly`;
- `SameSite=Strict`;
- cookie `Secure` em produção;
- comparação de credenciais com `timingSafeEqual`;
- limite básico de tentativas de login;
- verificação opcional de origem;
- CSP;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- nenhuma credencial RouterOS no frontend;
- allowlist de recursos RouterOS;
- `/rest/execute` bloqueado;
- execução de scripts bloqueada;
- `POST` permitido apenas para operações explicitamente necessárias, como `move` do firewall e `make-static` do DHCP;
- confirmação explícita adicional para mutações de firewall;
- modo somente leitura opcional;
- export de segurança opcional antes de mutações de firewall;
- backup lógico JSON pelo painel.

## Estrutura

```text
Mikrotk-Painel/
├── api/
│   ├── _lib/
│   │   ├── routeros.js
│   │   └── seguranca.js
│   ├── backup.js
│   ├── login.js
│   ├── logout.js
│   ├── routeros.js
│   └── session.js
├── src/
│   ├── css/
│   │   └── app.css
│   └── js/
│       └── app.js
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── README.md
```

## Requisitos

- RouterOS 7 com REST API;
- acesso HTTPS ao RouterOS a partir do backend da Vercel;
- conta Vercel;
- Node.js 20+ para desenvolvimento local.

## 1. Criar usuário dedicado no MikroTik

Não use o usuário `admin` no painel.

Exemplo de grupo dedicado:

```routeros
/user/group/add name=painel-web policy=read,write,rest-api
/user/add name=painel-api group=painel-web password="COLOQUE-UMA-SENHA-FORTE"
```

Não adicione `policy`, `sniff`, `test`, `ftp` ou outras permissões sem necessidade.

Se possível, restrinja o campo `address` do usuário para o endereço do host/túnel que acessará o RouterOS.

## 2. Habilitar REST API com HTTPS

O RouterOS REST usa o serviço web do equipamento. Para produção, configure certificado válido e use `www-ssl`.

Exemplo conceitual:

```routeros
/ip/service/set www disabled=yes
/ip/service/set www-ssl disabled=no certificate=SEU_CERTIFICADO
```

A URL usada pelo painel deverá responder em:

```text
https://seu-endereco/rest/system/resource
```

## 3. Vercel e redes privadas

Um deployment da Vercel não está dentro da sua LAN. Portanto isto **não funcionará diretamente**:

```env
MIKROTIK_URL=https://192.168.88.1
```

O backend precisa de um endereço alcançável por HTTPS.

Arquitetura recomendada:

```text
Vercel Function
      ↓ HTTPS
Tunnel / gateway protegido
      ↓ rede privada
MikroTik
```

Não publique simplesmente a porta administrativa do MikroTik para toda a Internet.

Opções possíveis:

- reverse proxy protegido;
- túnel Zero Trust;
- gateway/VPS conectado por VPN à rede;
- infraestrutura própria que exponha somente o endpoint necessário com autenticação e ACL.

## 4. Configurar variáveis da Vercel

Copie `.env.example` e configure no projeto:

```env
PAINEL_USUARIO=admin
PAINEL_SENHA=SENHA-FORTE-DO-PAINEL
SESSION_SECRET=CHAVE-ALEATORIA-COM-MAIS-DE-32-BYTES

MIKROTIK_URL=https://router.exemplo.com
MIKROTIK_USUARIO=painel-api
MIKROTIK_SENHA=SENHA-DO-USUARIO-ROUTEROS
MIKROTIK_TIMEOUT_MS=10000

PAINEL_MODO_SOMENTE_LEITURA=false
MIKROTIK_AUTO_EXPORT=false
MIKROTIK_PERMITIR_HTTP=false
ORIGEM_PERMITIDA=https://seu-painel.vercel.app
```

### `PAINEL_MODO_SOMENTE_LEITURA`

Quando `true`, o backend bloqueia `PUT`, `PATCH`, `DELETE` e `POST` para recursos RouterOS.

Útil para validar conectividade antes de liberar alterações.

### `MIKROTIK_AUTO_EXPORT`

Quando `true`, antes de uma alteração de firewall o backend solicita ao RouterOS um export chamado:

```text
painel-web-ultimo-backup.rsc
```

Se o export falhar, a alteração também falha. Isso é proposital para evitar aplicar uma mudança quando o mecanismo de segurança configurado não conseguiu funcionar.

### `MIKROTIK_PERMITIR_HTTP`

Deixe `false` em produção.

Só deve ser usado em ambiente controlado de desenvolvimento, preferencialmente quando HTTP já estiver encapsulado dentro de um túnel criptografado.

## 5. Deploy na Vercel

Importe o repositório na Vercel, configure as variáveis de ambiente e faça o deploy.

Não há framework frontend nem etapa de build obrigatória. Os arquivos estáticos são servidos diretamente e os arquivos dentro de `/api` funcionam como Vercel Functions.

## Como amarrar MAC → IP

No painel:

1. abra **Dispositivos / DHCP**;
2. localize a máquina;
3. se o lease for dinâmico, clique em **Fixar**;
4. clique em **Editar**;
5. altere o IP;
6. salve.

O backend também verifica conflitos de IP e MAC antes da alteração.

## Bloquear máquina

Depois de transformar o lease em estático:

```text
Dispositivos / DHCP
→ Editar
→ Bloquear acesso = Sim
→ Salvar
```

O painel usa a propriedade `block-access` do lease DHCP.

## Limitar banda

Exemplo:

```text
10M/10M
```

Preencha o campo **Limite de banda** do lease estático.

Observação: políticas de FastTrack podem interferir em cenários de controle de banda. Revise seu firewall caso a queue gerada pelo lease não tenha o comportamento esperado.

## Firewall — proteção contra lockout

O RouterOS processa regras na ordem configurada. Por isso o painel:

- mostra a ordem real recebida da API;
- permite mover regras para cima/baixo;
- exige confirmação antes de mutações;
- mostra aviso reforçado para regras `DROP` na chain `input`;
- pode gerar export automático antes da alteração.

Ainda assim, **uma regra de firewall incorreta pode remover seu acesso ao roteador**.

Antes de alterar regras críticas remotamente, mantenha um caminho alternativo de recuperação, como WinBox por MAC em rede local, console físico ou acesso administrativo secundário.

## Métodos REST usados

```text
GET     leitura
PUT     criação
PATCH   alteração
DELETE  exclusão
POST    somente comandos explicitamente permitidos
```

O proxy do painel não é um proxy REST irrestrito. Mesmo autenticado no painel, o usuário não consegue enviar uma chamada para `/rest/execute` por meio dele.

## Próximas evoluções recomendadas

- múltiplos MikroTiks por organização;
- banco de auditoria persistente;
- usuários e papéis (RBAC);
- histórico de alterações com diff;
- rollback automatizado de firewall;
- janela de confirmação após regra crítica (rollback automático se o painel perder contato);
- descoberta SNMP;
- gráficos de tráfego por interface;
- filas simples e queue trees;
- WireGuard;
- rotas e policy routing;
- DNS/DHCP Networks;
- logs do RouterOS;
- alertas de dispositivo offline;
- inventário de switches, APs, impressoras e computadores.

## Aviso operacional

Esse painel possui capacidade de alterar roteamento, leases e firewall. Trate o acesso ao painel como acesso administrativo ao próprio roteador.
