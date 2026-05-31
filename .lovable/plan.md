# Plano de execução

## 1. Capas dos jogos (aguardando ZIP)

Você vai me enviar um ZIP com as capas oficiais. Quando chegar:
- Copio para `src/assets/games/` mantendo nomes
- Expando `src/lib/games.ts` para ~40 jogos (Fortune Tiger, Rabbit, Dragon, Ox, Mouse, Aviator, JetX, Spaceman, Mines, Plinko X, Football X, Mine Island, Tower Rush, Caramelo Sortudo, Red Rascal, Arara da Sorte, Yo Dragon, Ze Zeus, Snoop Dogg Dollars, 7 & Hot Fruits, Wild Tiger, Fortune Garuda, Hot Pepper, Piñata Wins, Tigre da Sorte, Lucky Jaguar 500, Super 7, etc.)
- Categorizo em: Novos Jogos, Top 10, Slots, Crash, Jogos Instantâneos, Mines, Cassino Ao Vivo, Mesas BR

**Se quiser que eu comece agora sem o ZIP**, gero as capas com IA num estilo equivalente (slot dourado/asiático/crash) — só me avisa. Por padrão vou esperar o ZIP.

## 2. Layout pixel-perfect (desktop + mobile)

### Header
- Desktop: logo + nav horizontal (Esportes / Cassino / Ao Vivo / Torneios / Clube X / Promoções / Indique Amigos) com indicador verde-lima sob o ativo, avatar com badge de notificação, saldo + refresh, botão DEPOSITAR azul-claro arredondado
- Mobile: logo centralizado, hamburger à esquerda, avatar+saldo+DEPOSITAR compactos à direita (igual print 32)

### Sidebar desktop (estreita ~72px com tooltip, expansível)
Ícones na ordem exata do print 31: chevron, alvo (Missões), troféu (Torneios), presente (Resgatar), roleta verde, ingresso laranja (Bolões), e abaixo separador + ícones de ligas (cruzeiro, círculo, A, B, Sul-Americana, Libertadores, Premier, coroa)

### Drawer mobile (print 34)
Botões grandes coloridos com gradiente exato:
- Missões: roxo escuro → indigo
- Torneios: rosa → roxo
- Resgatar: laranja → amarelo
- Roleta: verde escuro
- Bolões: laranja → rosa → roxo
- Accordion "Esportes" expandido com lista de ligas

### Bottom nav mobile (print 32/33)
Menu / Esportes / **Clube X** (badge azul destacado no centro) / Cassino / Ao Vivo. Item ativo em verde-lima.

### Home
- Banner duplo com separador diagonal (print 31)
- Pills de categorias circulares verde-lima com ícones
- Search + filtro verde-lima
- Strip de providers pílulas escuras (PG, Pragmatic, Spribe, TaDa, SmartSoft, BGaming, Hacksaw, Spinomenal, Evoplay, Popok, NoLimit City, GalaxSys, Platipus, IronDog)
- Top 10 carrossel horizontal com numerais gigantes verde-lima atrás dos cards
- Seções: Novos Jogos, Slots, Crash, Jogos Instantâneos, Mines, Cassino Ao Vivo, Mesas BR — cada uma com "Ver mais"

## 3. Aba Esportes via iframe

Você pediu pra tentar o iframe mesmo sabendo do risco:
- `src/routes/esportes.tsx` vira full-bleed `<iframe src="https://pix.bet.br/sports" />` ocupando viewport todo
- Mantenho header/sidebar nossos por fora
- **Aviso real**: pix.bet quase certamente envia `X-Frame-Options: DENY` ou `Content-Security-Policy: frame-ancestors`. Se bloquear, aparece tela branca / "refused to connect" e não tem como burlar pelo frontend. Vou adicionar fallback: se detectar erro de carga em 5s, mostra botão "Abrir em nova aba"

## 4. Integração PodPay (gateway PIX)

Base: `https://api.podpay.app` (prod) | `https://sandbox.podpay.app` (teste)
Auth: header `x-api-key: sk_live_xxx` ou `sk_test_xxx`
Valores em **centavos** (R$ 100 = 10000)

### Server functions (`src/lib/podpay.functions.ts`)
- `createPixDeposit({ amount, cpf })` → POST `/v1/transactions` com idempotency-key, retorna `{ qrCode, copyPaste, txId }`
- `createPixWithdrawal({ amount, pixKey })` → POST `/v1/withdrawals`
- `getBalance()` → GET `/v1/balance` (admin)

### Server route (`src/routes/api/public/podpay-webhook.ts`)
- Recebe webhook de status (`paid`, `failed`, `refunded`, etc.)
- Valida assinatura/secret
- Atualiza `transactions.status` no banco (trigger existente já credita saldo quando vira `approved`)

### Modal Depósito (refazer igual print 35)
- Tab PIX (selecionada) com logo PIX, campos "Método: PIX" e "Depósito Mínimo: R$ 5" desabilitados
- Input valor + link "Possui cupom?"
- Grid 3x2 de presets com badges HOT amarelos (R$ 50, 250, 1.000)
- Botão DEPOSITAR azul cheio
- Após clicar: tela com QR code real do PodPay + copy-paste + timer

### Página Saque
- Form com seleção tipo de chave PIX (CPF/email/telefone/aleatória)
- Validação saldo, min/max das settings, taxa
- Cria withdrawal no PodPay quando admin aprova

### Secrets necessários
Vou pedir via `add_secret` quando começarmos: `PODPAY_API_KEY` e `PODPAY_WEBHOOK_SECRET`.

## 5. Refino completo das modais e páginas auth

- **Login/Registro**: 2 colunas com imagem promo à direita, campos limpos, "Esqueci senha", divisor "ou" + botão Google
- **Perfil**: layout 2 colunas — menu vertical (Dados, Saldo, Documentos, Segurança, Histórico) + conteúdo. Mobile vira accordion
- **Carteira**: card grande de saldo (real + bônus), botões Depositar/Sacar, últimas 5 transações
- **Histórico**: tabela responsiva, filtros (tipo, status, data), paginação

## 6. Painel admin — adicionar config PodPay

Em `/admin/configuracoes`: campos para ambiente (live/sandbox), exibir status da chave (mascarada), botão de teste de conexão.

---

## Ordem de execução

1. Esperar ZIP de capas (em paralelo: começo header/sidebar/mobile pois não dependem)
2. Header desktop + mobile refinado
3. Sidebar desktop + drawer mobile com gradientes exatos
4. Bottom nav mobile com Clube X destacado
5. Home: banners, pills, providers, Top 10, todas seções
6. Integrar capas do ZIP + expandir lib/games.ts
7. Iframe esportes + fallback
8. PodPay: secrets, server functions, webhook, modal depósito com QR real
9. Saque com PodPay
10. Polimento perfil, carteira, histórico, admin

**Antes de começar etapa 8** vou solicitar `PODPAY_API_KEY` via add_secret.

Posso seguir?