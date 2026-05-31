# Plano: Polir clone PixBet + Painel Admin

Vou fazer tudo em uma rodada longa, sem parar pra perguntar. Foco em fidelidade visual, mobile e backoffice funcional.

## 1. Sidebar (desktop + mobile)

- Largura fixa 72px (collapsed) / 240px (expanded), fundo `--brand` (azul royal).
- Botão toggle redondo no topo (seta verde-lima sobre azul escuro).
- 5 "big buttons" com gradientes exatos (Missões roxo, Torneios rosa→roxo, Resgatar laranja→amarelo, Roleta verde, Bolões laranja→roxo) — ícones brancos, label só quando expandido.
- Separador + seções colapsáveis: Esportes / Cassino / Promoções / Apps com chevron.
- Footer da sidebar: idioma + redes sociais (ícones pequenos).
- **Mobile**: sidebar vira drawer (Sheet) acionado por hambúrguer no header, fundo escuro com mesma estrutura, fecha ao navegar.

## 2. Header

- Mobile: logo centralizada, hambúrguer à esquerda, avatar+saldo à direita compactos, botão DEPOSITAR cheio em verde-lima.
- Desktop: ajustar espaçamento dos links, indicador verde-lima embaixo do ativo, refresh-icon ao lado do saldo (animação rotate ao clicar), badge de notificações no avatar (número 14).
- Dropdown do avatar com itens estilizados (Perfil, Depósito, Saque, Histórico, Sair) — fundo escuro, hover verde-lima.

## 3. Páginas de transação (Depósito / Saque / Histórico)

- **Depósito** (rota + dialog): tabs PIX / Crédito (Crédito desabilitado "em breve"), grid de valores rápidos R$ 20/50/100/250/500/1000 com badge HOT nos populares, input custom, botão verde-lima grande, área "Como funciona" com 3 passos, QR code mock + copia-e-cola.
- **Saque**: form com seleção chave PIX (CPF/Email/Telefone/Aleatória), valor, validação saldo, regras (mínimo/máximo lidos das settings), status pendente.
- **Histórico**: tabela responsiva com filtros (Todos/Depósitos/Saques/Apostas), badges de status coloridos, paginação, vazio-state ilustrado.

## 4. Perfil (igual print 30)

- Layout 2 colunas (sidebar de menu vertical + conteúdo).
- Menu: MEU PERFIL, GESTÃO DE SALDO, HISTÓRICO, EXTRATO, NOTIFICAÇÕES, INDIQUE E GANHE, PRÊMIOS, INFORME IRPF, SAIR.
- Card grande do saldo com botões DEPOSITAR/SACAR, dados pessoais editáveis (nome, CPF, email, telefone), upload de avatar.
- Mobile: menu vira accordion no topo.

## 5. Home e demais páginas

- Top 10: números gigantes verde-lima atrás dos cards com perspectiva correta, carrossel horizontal com setas.
- Categorias adicionais (Slots, Crash, Mesas) com "Ver mais" + scroll horizontal de cards.
- Footer 5 colunas (Sobre, Ajuda, Legal, Pagamentos, Responsável) com selos +18, jogo responsável, badges de provedores.
- Torneios: cards com countdown ao vivo (timer JS), prize pool, ranking.

## 6. Painel Admin (NOVO)

Rota protegida `/admin/*` — só `role = 'admin'`. Layout próprio (sidebar admin escura, header com nome do admin).

Páginas:
- **Dashboard**: KPIs (total depositado hoje/mês, total sacado, usuários novos, saldo total em conta), gráfico simples de transações últimos 30 dias.
- **Usuários**: tabela com busca, filtros, ver detalhes (saldo, KYC, histórico de transações, bloquear/desbloquear, ajustar saldo manual).
- **Depósitos**: lista com status (pendente/aprovado/rejeitado), botões aprovar/rejeitar (atualiza saldo automaticamente via server fn).
- **Saques**: mesma estrutura, aprovar/rejeitar (debita saldo na aprovação, devolve na rejeição).
- **Configurações**: depósito mínimo/máximo, saque mínimo/máximo, taxa de saque, bônus de boas-vindas, manutenção on/off.
- **Transações**: log geral com filtros e export CSV.

## 7. Backend

Migrations novas:
- `app_settings` (key/value singleton com defaults: min_deposit=20, max_deposit=10000, min_withdraw=50, max_withdraw=5000, withdrawal_fee=0, maintenance_mode=false).
- Adicionar status `approved`/`rejected` no enum `transaction_status` se faltar.
- Trigger: ao aprovar transaction tipo `deposit`, soma no `profiles.balance`; ao aprovar `withdrawal`, debita.
- RLS: admin pode SELECT/UPDATE todas transactions e profiles via `has_role(auth.uid(),'admin')`.
- Permitir UPDATE em transactions só pra admin.

Server functions (`src/lib/admin.functions.ts`):
- `listUsers`, `getUserDetail`, `adjustBalance`
- `listTransactions(filter)`, `approveTransaction(id)`, `rejectTransaction(id)`
- `getSettings`, `updateSettings`
- `getDashboardKPIs`
Todas com middleware que checa `has_role(userId,'admin')`.

Server functions usuário:
- `createDeposit({amount})` — valida contra settings, cria pending.
- `requestWithdrawal({amount, pix_key})` — valida saldo+settings, cria pending.

## 8. Mobile polish (toda a app)

- Header sticky, sidebar drawer, bottom-tab opcional (Início / Cassino / Depósito / Perfil) só em <768px.
- Banners: 1 por vez no mobile, swipe.
- Cards de jogo: grid 3 colunas no mobile, scroll horizontal nas seções "Top 10".
- Dialogs: full-screen no mobile, padding seguro pra notch.
- Touch targets ≥44px em todos botões/inputs.

## Como o usuário promove alguém a admin

Após login, rodar manualmente no SQL: `update user_roles set role='admin' where user_id=...`. Vou deixar instrução no chat de qual ID usar (ou crio uma página dev temporária pra promover via UI — confirmar depois).

## Arquivos principais a criar/editar

- Editar: `header.tsx`, `app-sidebar.tsx`, `banner-carousel.tsx`, `site-shell.tsx`, `styles.css`, `routes/_authenticated/perfil.tsx`, `deposito.tsx`, `saque.tsx`, `historico.tsx`, `routes/torneios.tsx`, `routes/index.tsx`, `components/layout/footer.tsx`.
- Criar: `components/layout/mobile-bottom-nav.tsx`, `components/layout/mobile-drawer.tsx`, `components/admin/admin-shell.tsx`, `components/admin/kpi-card.tsx`, `routes/admin.tsx` (layout), `routes/admin/index.tsx`, `users.tsx`, `users.$id.tsx`, `depositos.tsx`, `saques.tsx`, `transacoes.tsx`, `configuracoes.tsx`, `lib/admin.functions.ts`, `lib/transactions.functions.ts`, `lib/settings.functions.ts`.
- Migrations: `app_settings` + policies admin + trigger de aprovação.

## Escopo fora

- Integração real com gateway PIX (continua mock — aprovação manual via admin simula o callback).
- KYC real (apenas campo status).
- Jogos jogáveis (continuam só capas).

Confirma que posso seguir nessa direção?