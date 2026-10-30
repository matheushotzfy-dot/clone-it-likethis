# Redesign apostamaxy no estilo da referência (shuffle.com/pt)

A referência bloqueia acesso do nosso servidor (aviso de região, mesmo pelo Paraguai). O plano segue o estilo conhecido do site; se você mandar prints (home, menu lateral, jogos, celular), ajusto os detalhes para ficar fiel.

## O que muda
- **Cores:** fundo quase preto, cartões grafite, roxo vibrante como cor principal (botões, destaques, menu ativo). Sai o azul-claro.
- **Menu lateral:** estreito, recolhível (só ícones), grupos Cassino / Esportes / Promoções, ativo em roxo.
- **Topo:** logo apostamaxy à esquerda, busca central, saldo em R$ com botão roxo "Depositar" (PIX), login/cadastro.
- **Início:** 3 banners lado a lado (cadastro, PIX, esportes) no topo; abaixo faixas horizontais de jogos com setas: Populares, Slots, Crash, Ao Vivo, Provedores.
- **Cards de jogos:** capa vertical arredondada, leve zoom e brilho roxo ao passar o mouse, botão jogar.
- **Rodapé:** colunas de links, jogo responsável, +18.
- **Celular:** menu inferior com Depositar no centro, faixas roláveis com o dedo.

## O que não muda
- Marca apostamaxy e logo atual (não copiamos logo, nomes nem artes da referência).
- Só reais e PIX, sem cripto; sem vitórias ou prêmios inventados.
- Jogos, login, depósito/saque, KYC e painel admin continuam funcionando igual.

## Detalhes técnicos
- Tokens novos em `src/styles.css` (primary roxo em oklch, superfícies, glow).
- Editar `app-sidebar`, `header`, `header-account`, `mobile-bottom-nav`, `footer`, `banner-carousel` (3 colunas), `game-rail`, `pf-game-card`, `category-nav`, `routes/index.tsx`.
- Atualizar memória de identidade (roxo substitui azul-claro).
- Validar com Playwright em desktop e 393px: sem overflow, jogos carregando, abertura de cadastro/depósito.
