# Project conventions

## Dinheiro
- `profiles.balance` só muda dentro de `public.wallet_apply()`; um trigger bloqueia qualquer UPDATE direto, inclusive da service role. Toda mudança gera uma linha imutável em `wallet_ledger` com chave de idempotência única.
- Depósito credita quando a transação passa para `approved`. Saque reserva o valor na criação (`withdrawal_hold`), devolve se for recusado/cancelado (`withdrawal_release`) e não mexe no saldo ao aprovar.
- A taxa do saque é gravada em `transactions.fee` no pedido (imutável); o admin envia `amount - fee`. `decided_at` é preenchido pelo banco quando o status muda. Saque com `kyc_required` só é pago depois dos documentos aprovados.
- Transação finalizada não muda de status; valor, tipo e dono nunca mudam; transação que movimentou saldo não pode ser apagada.
- Ajuste manual do admin só via `admin_adjust_balance` (exige motivo e request id; grava auditoria).
- `app_settings.real_money_enabled = false` (homologação) bloqueia no banco depósitos e saques de jogadores; só o admin lança crédito de teste.
- Regras de checagem antes de falar com gateway/provedor ficam em `src/lib/money.server.ts` (configurações, conta suspensa, limites de jogo responsável, textos de erro).
- `admin_wallet_reconciliation` compara saldo e soma do ledger; a diferença precisa ser zero.

## PlayFivers
- Só provedores oficiais (`OFICIAL - ...`) entram no catálogo; jogos `original`/clones nunca entram nem abrem. `user_rtp` nunca é enviado e o painel não altera RTP nem limite de ganho do agente.
- O lobby lê a tabela `games` (sincronizada pelo admin); o jogo abre pelo `games.id`, nunca por provedor/código vindo do cliente.
- URL de callback no painel da PlayFivers: `https://DOMINIO/api/public/playfivers/<PLAYFIVERS_CALLBACK_TOKEN>`. BALANCE vai para `/webhook`; WinBet e Refund para `/api/webhook` e exigem também as credenciais do agente.
- Aposta e ganho aplicam no banco por `apply_playfivers_transaction` (idempotente por `txn_id`; a aposta precisa caber no saldo). Refund estorna a rodada original por `apply_playfivers_refund`. Casos fora do normal ficam em `pf_callback_log`.
- Toda chamada à API da PlayFivers passa por `resolvePFEndpoint` (relay de IP fixo opcional).

## Esportes
- Aposta só pelo servidor (`placeSportsBet` revalida a odd na ESPN e chama `place_sports_bet` com a service role). O `requestId` do cupom torna a aposta idempotente (`sports_bets.request_id`). Liquidação automática por `runSettlement` com a regra pura `settleMatchResult` (tempo normal; adiado/cancelado anula).
- Parsing da ESPN e regras de preço ficam em `sports-data.ts`; placares são buscados por `sports.functions.ts` com cache e deduplicação.

## Contas (Portaria SPA/MF 1.231)
- Cadastro e login só pelo servidor (`signUp` e `signIn` em `auth.functions.ts`). O cadastro grava nacionalidade, endereço, IP e navegador, versão dos termos e consentimento LGPD; `handle_new_user` valida de novo (CPF, 18+, endereço, aceite). Senha com letras, números e caractere especial (`password-policy.ts`).
- Login por e-mail ou CPF; 3 senhas erradas bloqueiam (`auth_record_login`) até trocar a senha pelo e-mail (`auth_clear_lock`). Conta encerrada não entra; em autoexclusão só entra quem tem saldo para sacar. O e-mail ligado a um CPF nunca volta ao navegador.
- Identidade (documento + selfie) em `kyc_submissions` com `transaction_id` nulo; `profiles.kyc_status` none/pending/verified/rejected. Com `require_identity` ligado, `rg_check` recusa aposta e depósito e o saque exige identidade verificada.
- Limites, pausa e autoexclusão em `rg_limits`; `rg_check` roda antes de qualquer aposta, abertura de jogo ou depósito. Reduzir limite vale na hora; aumentar vale em 24h; pausa só termina antes com 24h de espera.
- `PlayGuard` (logado): heartbeat de sessão (`touch_last_seen`), aviso de tempo, novo aceite quando `terms_version` muda e sugestão de limites no primeiro acesso. `RgStrip` é o painel permanente (tempo de sessão e resultado do dia).
- Campos de status, KYC, login, sessão e termos do perfil só mudam por função do banco ou pelo admin (`prevent_profile_tampering`).

## Homologação
- `active_gateway = 'teste'` com dinheiro real desligado gera Pix simulado (`testpay.functions.ts`, `transactions.is_test`). A confirmação passa pelo mesmo caminho de um depósito real. O banco recusa transação de teste com dinheiro real ligado. Antes de ligar dinheiro real, zerar os saldos de teste.

## Interface
- Cores com função fixa: `primary` (azul) ações de jogo e navegação, `pix` (verde-água) só dinheiro entrando, `gold` ganhos/prêmios/ranking, `live` evento acontecendo. Títulos em Barlow Condensed sem caixa alta; texto em Figtree; valores com `num` (algarismos tabulares).
- Papéis visuais ficam em `src/styles.css`; não criar camadas de estilo novas por cima das existentes. Classes base que recebem ajuste por utilitário (como `.field-input`) ficam em `@layer components`.
- Capas de jogo usam `GameTile`, que some se a arte falhar; wrappers de trilho usam `empty:hidden` para não deixar buraco.
- Rotas folha usam `pageMeta` com título e descrição próprios.
- Conteúdo de promoção, torneio ou indicação só aparece se existir de verdade, com regras completas.
- Ajustes só de celular ficam em `max-width: 639px`, sem quebrar o desktop nem o zoom.
- Lobby organizado por categoria (`slot`, `crash`, `live`, `table`) e por tipo de mesa (`src/lib/game-kinds.ts`: roleta, game show, baccarat, blackjack), derivado do nome. Contagens e provedores vêm de `getLobbyCounts` e `lobby_providers` (SQL), nunca somados no navegador.
- Selos de capa só com fato: "Ao vivo" para mesa com crupiê, "Novo" para jogo com menos de 14 dias no catálogo.
- A barra de navegação de baixo aparece até 1024px; `.app-column` reserva o espaço dela.

## Admin
- Telas em `src/routes/admin/*` usam o kit `src/components/admin/ui.tsx`; funções em `admin.functions.ts` sempre chamam `assertAdmin`. Toda ação que muda dado grava `admin_log`.
- Números de período vêm de funções SQL (`admin_daily_stats`, `admin_finance_summary`), nunca de somas no navegador (o PostgREST corta em 1000 linhas).
- Segredos de gateway nunca voltam inteiros ao navegador.

## VeoPag / gateways
- Credite depósitos VeoPag só depois de reconsultar a API da VeoPag (o corpo do webhook não é assinado); essa lógica fica em `src/lib/veopag.server.ts`.
- Webhooks da BSPay e PodPay recusam qualquer chamada sem assinatura válida. Só o gateway ativo (`active_gateway`) gera Pix.
