# Cassino apostamaxy: redesign completo com identidade marcante

Objetivo: tirar a cara de "modelo pronto". Nada de cartões genéricos com brilho, gradientes roxo/azul, ícones padrão em quadradinho ou textos de marketing vagos. Cada parte do cassino ganha um desenho próprio, com a estrutura de navegação da Stake (lateral, topo enxuto, faixas de jogos), mas acabamento nosso.

## Direção visual
- **Base:** azul-ardósia profundo em camadas bem definidas (sem sombras borradas). Bordas finas e cantos menores (6px), visual de produto, não de template.
- **Cor de marca:** azul-claro elétrico só em ação (Depositar, jogar, item ativo). Verde apenas ao vivo/ganho. Sem degradês decorativos.
- **Tipografia:** títulos condensados em caixa alta e peso forte (estilo placar esportivo), números tabulares em saldo, odds e valores. Texto curto e direto em português.
- **Ícones:** conjunto próprio desenhado em traço único (cassino, slots, crash, ao vivo, esportes, promoções, PIX), substituindo os ícones padrão em todo o site.
- **Movimento:** poucos e precisos: capa do jogo sobe 4px e revela "Jogar" e provedora; faixa ao vivo com placar rolando; contador de saldo animando ao mudar. Respeita "reduzir movimento".

## O que é refeito
1. **Topo:** barra única fina; logo, busca expansível, saldo em R$ com botão Depositar (PIX) colado; menu da conta compacto.
2. **Menu lateral:** chave Cassino | Esportes no topo (dois botões lado a lado, como a Stake), lista de seções com os novos ícones, recolhe para só ícones.
3. **Início:**
   - Faixa de destaque em 3 colunas (promoções do admin), sem carrossel genérico.
   - Atalhos Cassino e Esportes com fotografia própria de produto.
   - Faixa "Agora ao vivo" com jogos de futebol reais e odd rápida.
   - Faixas de jogos com título condensado, contador "ver todos" e setas: Populares, Slots, Crash, Ao Vivo, Novidades.
   - Faixa de provedoras em logos monocromáticos.
4. **Cards de jogos:** capa vertical limpa, sem moldura brilhante; selo discreto (Ao vivo, Novo) só quando verdadeiro.
5. **Cassino / Slots / Ao Vivo / Crash:** cabeçalho com título grande condensado, filtros em linha (categoria, provedora, busca, ordenar), grade densa.
6. **Esportes:** mesmo idioma visual (linhas de jogo, odds, cupom) ajustado aos novos estilos.
7. **Depósito, login e cadastro:** janelas redesenhadas no mesmo padrão, com passos claros e QR PIX limpo.
8. **Rodapé e menu de celular:** rodapé em colunas com jogo responsável/18+; menu inferior com Depositar no centro e novos ícones.
9. **Novas artes:** banners e capas próprios gerados em alta qualidade, sem pessoas falsas, moedas ou cripto.

## O que não muda
- Marca apostamaxy e logo atual.
- Só reais e PIX; nenhum prêmio, ganhador ou número inventado.
- Jogos, login, pagamentos, KYC, apostas esportivas e painel admin funcionam igual.

## Detalhes técnicos
- Tokens novos em `src/styles.css` (raio, superfícies, fonte condensada carregada via link no `__root`), utilitários `@utility` para título condensado e números.
- Novo módulo `src/components/icons/` com SVGs próprios; troca dos ícones lucide em header, sidebar, nav mobile, category-nav.
- Reescrever `header`, `header-account`, `app-sidebar`, `mobile-bottom-nav`, `footer`, `banner-carousel` (grade 3 colunas), `hub-tiles`, `game-rail`, `pf-game-card`, `category-nav`, `catalog-grid`, rotas `index`, `cassino`, `slots`, `ao-vivo`, `esportes` e diálogos de auth/depósito, só na apresentação.
- Nova faixa "Agora ao vivo" reaproveitando `getSportsEvents`.
- Atualizar memória de identidade e roadmap.
- Validar com Playwright em 1280px e 393px: sem cortes, jogos com capa, odds clicáveis, depósito/cadastro abrindo, sem erros.
