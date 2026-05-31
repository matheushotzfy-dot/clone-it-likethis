## Refazer home 100% fiel ao PixBet

Olhando os screenshots vs o que está no preview, os principais "gaps" visuais são:

### 1. Header (topo azul)
- Fundo **azul royal sólido** (`#1351d8` aproximado), não navy escuro
- Logo `pixbet` em texto branco com o "x" em verde-limão
- Nav links em **branco**, item ativo em **verde-limão** (`Cassino` no print)
- Botão `ENTRAR` outline verde-limão, `REGISTRAR` sólido verde-limão preto
- Ícone presente (gift) à esquerda dos botões

### 2. Sidebar esquerda
- Header "Divirta-se com" + botão de colapso `<`
- 5 botões grandes coloridos com gradiente e ícone à direita:
  - Missões (roxo) 🎯
  - Torneios (rosa→roxo) 🏆
  - Resgatar (laranja→amarelo) 🎁
  - Roleta (verde) 🧭
  - Bolões (laranja→rosa) 🎫
- Seções colapsáveis abaixo: **Esportes**, **Cassino**, **Promoções** (com chevron)
- Sub-items de Esportes: La Liga, Copa do Nordeste, Brasileirão A/B, Sul-Americana, Libertadores, Premier League — cada um com ícone circular
- Fundo azul royal igual ao header

### 3. Hero / Banners
- Carrossel **mostrando 2 banners lado-a-lado** (não 1 só) com corte diagonal verde-limão entre eles
- Dots de paginação embaixo

### 4. Categorias circulares
- Ícones em **círculo verde-limão** com símbolo preto dentro (estilo "moeda")
- Labels: Slots, Crash, Popok, Tada, Drops, Promoções, Mesas Brasileiras, Jetx
- Centralizados, não grid esticado

### 5. Busca
- Input escuro arredondado full-width + botão filtro verde-limão quadrado

### 6. Faixa de provedores
- Pills escuras arredondadas com logos: PG, Pragmatic Play, Spribe, TaDa, SmartSoft, BGaming, Hacksaw, Spinomenal, Evoplay, Popok, NoLimit City, Galaxsys
- Scroll horizontal

### 7. Top 10
- Cards com **número gigante verde-limão atrás** (1, 2, 3…) — já existe mas precisa ficar mais protagonista
- Mostra 12 itens em scroll horizontal

### 8. Modais Login/Registro (prints 25, 26)
- **Dialog largo (~960px)** com 2 colunas:
  - Esquerda: arte promocional "A PRIMEIRA BET 100% BRASILEIRA" (imagem gerada)
  - Direita: formulário azul royal com inputs estilizados (ícone à esquerda, fundo azul escuro arredondado)
- Registro: CPF, email, telefone, senha + checkbox de termos + botão verde "Criar conta"
- Login: usuário/CPF/email, senha, botão "Entrar", link "Esqueci minha senha", "Não tem conta? Registrar"
- Esses modais devem abrir **por cima** da home (Dialog), não rotas separadas

### 9. Página Torneios (print 27)
- Cards de torneio com banner, prêmio, countdown (dias/horas/min/seg) e top 3 jogadores
- Coluna direita: card de perfil com avatar, nível, atalhos (Missões, Torneios, Resgatar, Roleta), saldo, botões SACAR/DEPOSITAR
- Rodapé com 5 colunas de links

### 10. Modal Depósito (print 29)
- Dialog escuro com botão PIX, método, valor, presets R$20/50/100/250/500/1000 (alguns com badge "HOT"), botão DEPOSITAR azul claro

### 11. Perfil (print 30)
- Sidebar de menu: MEU PERFIL, GESTÃO DE SALDO, HISTÓRICO DE APOSTAS, EXTRATO COMPLETO, NOTIFICAÇÕES, INDIQUE E GANHE, PRÊMIOS E RECOMPENSAS, INFORME IRPF, SAIR
- Área principal com saldo grande, botões Depositar/Sacar

---

## Arquivos a tocar

**Design tokens** (`src/styles.css`):
- Trocar `--background` (manter dark), criar `--brand-blue: oklch(...)` para header/sidebar
- `--primary` = verde-limão (`oklch(0.92 0.22 130)` aprox)
- Surfaces de input/modal em azul royal escuro

**Componentes**:
- `header.tsx` — fundo brand-blue, nav branco, ativos verde
- `app-sidebar.tsx` — reconstruir: bloco "Divirta-se com" + 5 botões gradiente + accordions Esportes/Cassino/Promoções
- `banner-carousel.tsx` — exibir 2 banners simultâneos com diagonal
- `casino/category-pills.tsx` (novo) — círculos verde-limão
- `casino/provider-strip.tsx` (novo) — pills com logos texto
- `auth/login-dialog.tsx` (novo) — modal 2 colunas
- `auth/register-dialog.tsx` (novo) — modal 2 colunas
- `auth/deposit-dialog.tsx` (novo) — modal PIX com presets
- `casino/promo-art.jpg` (novo, gerado) — arte "A PRIMEIRA BET" para os modais

**Páginas**:
- `routes/index.tsx` — reorganizar ordem: banner → categorias → busca → providers → Top10 → Slots → Crash → Live
- `routes/torneios.tsx` — refazer com cards de torneio + sidebar de perfil
- `routes/_authenticated/perfil.tsx` — menu vertical estilo print 30
- `routes/_authenticated/deposito.tsx` — converter em rota que abre dialog ou refletir o layout do print 29

**Auth flow**:
- Header `ENTRAR`/`REGISTRAR` abre dialogs em vez de navegar para `/login` `/registro` (mantém as rotas como fallback)
- Submit usa `supabase.auth.signUp/signInWithPassword` já existente

**Imagens novas a gerar** (imagegen, fast):
- `promo-side.jpg` — arte vertical "A PRIMEIRA BET 100% BRASILEIRA" para modais
- `banner-penalty.jpg` — banner Penalty Shoot-Out estilo arcade
- `banner-evoplay.jpg` — banner "Entre no ritmo do jogo"
- `banner-popok.jpg` — banner POPOK boas-vindas

**Logos de provedores**: usar texto estilizado em pills (sem baixar marcas externas) para evitar risco de IP — sigla + estilo que lembra cada uma.

---

## Pedido só pra confirmar antes de começar

Vou fazer tudo isso em **uma rodada longa**. Não vou parar pra perguntar mais nada. O resultado vai ficar visualmente muito próximo dos prints, com login/registro/depósito funcionais (auth real via Cloud, depósito mock). Posso seguir?