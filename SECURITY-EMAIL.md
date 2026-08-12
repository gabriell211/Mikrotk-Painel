# HYDRA — Segurança de e-mail

A área **SMTP / Segurança** combina a configuração do cliente SMTP do RouterOS com controles de saída para reduzir abuso de e-mail, spam e phishing originado por dispositivos comprometidos.

## Proteção de borda

A HYDRA mantém duas address-lists próprias:

- `HYDRA_SMTP_RELAYS`: servidores SMTP autorizados;
- `HYDRA_SMTP_CLIENTS`: redes IPv4 que devem obedecer à política.

Ao aplicar a proteção, a HYDRA cria uma regra `DROP` para novas conexões TCP nas portas `25`, `465` e `587` quando a origem pertence às redes protegidas e o destino não pertence aos relays autorizados.

A regra não cria `ACCEPT`. Portanto, um relay autorizado ainda precisa ser permitido pelas políticas normais do firewall. Isso evita transformar a proteção SMTP em um bypass das regras existentes.

Opcionalmente, a mesma política protege conexões SMTP originadas pelo próprio RouterOS.

## TLS

A opção de endurecimento configura o cliente `/tool e-mail` para:

- `tls=yes`;
- `certificate-verification=yes`.

A senha SMTP salva no RouterOS não é retornada ao navegador.

## Observabilidade

As regras gerenciadas pela HYDRA usam log com os prefixos:

- `HYDRA-SMTP-DROP`;
- `HYDRA-SMTP-ROUTER`.

O painel lê `/log` em modo estritamente somente leitura e mostra eventos recentes, além de inspecionar `/ip/firewall/connection` para destacar conexões SMTP ativas fora dos destinos autorizados.

## SPF, DKIM e DMARC

O painel possui diagnóstico de registros TXT públicos para:

- SPF;
- DKIM, usando o seletor informado;
- DMARC e a política `p=none`, `quarantine` ou `reject`.

Essa verificação identifica configuração ausente ou fraca contra spoofing. A HYDRA não altera o DNS do domínio: correções de SPF, DKIM e DMARC devem ser publicadas no provedor DNS/e-mail responsável pelo domínio.

## Limite da proteção

Essa camada reduz abuso SMTP e spoofing mal configurado, mas não substitui um gateway de segurança de e-mail. Inspeção de anexos, URLs maliciosas, reputação de remetente e conteúdo de mensagens recebidas deve continuar no Microsoft 365, Google Workspace, servidor de e-mail ou gateway dedicado.
