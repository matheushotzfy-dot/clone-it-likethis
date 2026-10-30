# Redesign apostamaxy no estilo esportivo da Stake, só que melhorado e com cara própria

A referência é a área de esportes da Stake: fundo azul-ardósia escuro, menu lateral com as modalidades, abas Ao Vivo / Próximos e a lista de jogos com odds clicáveis. A gente usa essa base, mas com identidade apostamaxy e acabamento melhor.

## O que muda
- **Cores:** fundo azul-ardósia profundo, cartões em camadas um pouco mais claras, azul-claro elétrico como cor de ação (Depositar, odd selecionada). Verde só para "ao vivo" e ganhos. Não copiamos o verde da Stake.
- **Menu lateral:** blocos "Cassino" e "Esportes" no topo; lista de modalidades e ligas com ícones próprios; recolhível em ícones.
- **Topo:** logo apostamaxy, busca, saldo em R$ com botão "Depositar" (PIX), entrar/cadastrar.
- **Esportes (página principal da referência):**
  - Faixa de banners (Copa, PIX, cadastro).
  - Abas Ao Vivo / Próximos / Favoritos e chips de modalidade.
  - Linhas de jogo compactas: liga, horário ou placar ao vivo, times com escudos e 3 botões de odd (1 / X / 2) que acendem ao clicar.
  - Cupom de aposta fixo à direita no computador e como gaveta embaixo no celular.
- **Cassino / Início:** mesmo visual, com faixas de jogos (Populares, Slots, Crash, Ao Vivo) e cards com efeito ao passar o mouse.
- **Melhorias além da referência:** animação suave nas odds que mudam, indicador ao vivo pulsando, carregamento com esqueletos, tudo bem legível no celular.

## O que não muda
- Marca e logo apostamaxy; nada de logo, nome ou arte da Stake.
- Só reais e PIX, sem cripto; sem vitórias ou prêmios inventados.
- Dados de jogos esportivos, regras de aposta, login, depósito/saque, KYC e painel admin continuam iguais.

## Detalhes técnicos
- Novos tokens em `src/styles.css` (superfícies ardósia, primary azul-claro, `--live` verde, glow).
- Editar `app-sidebar`, `header`, `header-account`, `mobile-bottom-nav`, `footer`, `banner-carousel`, `game-rail`, `pf-game-card`, `category-nav`, `routes/index.tsx` e a página de esportes (linhas de jogo, botões de odd, cupom com o `BetSlipDialog`/RPC existentes).
- Registrar a tarefa no roadmap e atualizar a memória de identidade.
- Validar com Playwright em desktop e 393px: sem overflow, jogos e odds carregando, clique em odd abre o cupom, cadastro/depósito abrem.
