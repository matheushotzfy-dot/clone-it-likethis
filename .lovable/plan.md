# Reformulação geral do SANTOSBET

Redesign completo do site com foco em jogos visíveis desde o primeiro scroll, superfícies lisas (estilo "PHP liso": pouca sombra, muita linha fina, densidade alta), microinterações em tudo e nitidez 4K. Apostas esportivas sai do produto.

## Direção visual travada

- **Paleta Royal Blue PIX**: `#0c1430` (fundo), `#16224a` (superfície), `#3b6fa0` (brand), `#5cbdb9` (accent/CTA ciano).
- **Tipografia**: Sora nos títulos, Manrope no corpo (carregadas via `<link>` no root).
- **Layout**: Hero + Grid — banner de destaque no topo, trilhas densas de jogos abaixo.
- Superfícies planas, bordas de 1px em branco 8%, raio menor (10px), sem gradientes roxos, sem glow exagerado. Hover = elevação sutil + borda ciano + zoom leve na arte do jogo.

## Remoção de apostas esportivas

- Apagar rota `/esportes` e as funções de servidor `sports.functions.ts` e `sports-bet.functions.ts`.
- Remover links de Esportes/ligas/bolões da sidebar, header, footer e navegação inferior mobile.
- Limpar utilidades CSS criadas só para a sportsbook (`pitch-bg`, `live-shimmer`, `stripes-live`, `stripes-gold`).
- Tabelas de apostas esportivas no banco ficam intactas (sem migração destrutiva); apenas deixam de ser usadas.

## Navegação refeita do zero

**Header**: barra fina e fixa, logo compacto, busca global sempre visível no desktop, saldo + botões Entrar/Cadastrar como pílulas ciano, ícones em traço fino e uniforme.

**Sidebar**: lista limpa por categoria de cassino (Populares, Slots, PG, Crash, Ao Vivo, Provedores, Promoções, Torneios, Indique). Fim dos botões com gradiente colorido; itens passam a ser linhas com ícone, indicador ativo em barra ciano e modo colapsado só com ícones.

**Bottom nav mobile**: 5 itens (Início, Cassino, Ao Vivo, Depósito, Perfil) com indicador ativo animado.

## Home (Hero + Grid)

1. Hero: carrossel de banners com proporção fixa, paginação em barras finas e imagens em alta resolução.
2. Barra de busca + pílulas de categoria (Populares, PG, Slots, Crash, Ao Vivo, Mesas).
3. Trilha "Provedores" horizontal com scroll suave.
4. Trilhas de jogos: **PG/Populares → Crash → Cassino Ao Vivo → Slots**, cada uma com "Ver mais" e scroll horizontal no mobile / grade no desktop.
5. Cards de jogo redesenhados: proporção 3:4, `srcset`/tamanhos corretos para telas 4K, overlay de play em blur, nome e provedor em duas linhas, skeleton no carregamento e fallback estilizado.

A lógica de catálogo (PlayFivers, classificação PG/Crash/Ao Vivo, prioridade de PG no topo) permanece exatamente como está — só a apresentação muda.

## Catálogo (Cassino, Slots, Ao Vivo)

Layout unificado: cabeçalho da categoria, busca, filtro por provedor, grade responsiva (2 → 6 colunas) e paginação "Carregar mais" já existente. Mesmo card novo em todas as telas.

## Perfil, Depósito, Saque, Histórico

Reestilizados no novo sistema: cards planos, campos de formulário com borda fina e foco ciano, tabelas com linhas zebradas discretas, status como badges sólidos. Nenhuma mudança nas regras de negócio (PIX, gateways, KYC, bônus continuam iguais).

## Detalhes técnicos

- Tokens novos em `src/styles.css` (`@theme inline` + `:root`), incluindo `--font-display`/`--font-sans` e utilidades novas de hover/superfície; remoção dos tokens antigos de gradiente.
- Fontes via `<link>` em `src/routes/__root.tsx`.
- Componentes de layout reescritos: `header.tsx`, `app-sidebar.tsx`, `mobile-bottom-nav.tsx`, `footer.tsx`, `site-shell.tsx`.
- Novo `pf-game-card.tsx` com imagem responsiva e estados de loading/erro; `banner-carousel.tsx`, `category-pills.tsx`, `provider-strip.tsx` refeitos.
- `head()` por rota revisado (título, descrição, og/twitter) sem menções a apostas esportivas.
- Nada de biblioteca de UI nova; animações com CSS/utilities do projeto.

## Fora de escopo

- Painel admin (mantido como está).
- Mudanças em gateways de pagamento, KYC ou saldo.
- Qualquer nova integração de odds.
