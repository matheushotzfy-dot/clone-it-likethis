# Home mais viva + cadastro que converte

Objetivo: manter a base atual (limpa e confiável), mas subir a energia visual — cor, luz, movimento sutil — e reorganizar a parte inicial para o jogo aparecer antes. Nada de exagero: zero neon piscante, zero animação que atrapalhe leitura.

## 1. Paleta com mais vida (sem perder credibilidade)

O visual está cinza-azulado porque só existe um accent (#5cbdb9) usado em tudo. Adiciono uma família de acentos por categoria e camadas de luz:

- Accent quente secundário (âmbar/dourado) para "Mais jogados", ranking e badges de bônus.
- Accent por trilha: Populares (âmbar), Crash (coral/vermelho), Ao Vivo (roxo/magenta), Slots (ciano atual).
- Gradientes de superfície suaves nos painéis (topo levemente mais claro) para o fundo deixar de ser plano.
- Glows suaves atrás das seções de destaque, com opacidade baixa (nada de blur estourado).

Tudo em tokens novos em `src/styles.css` (`--accent-hot`, `--accent-crash`, `--accent-live`, gradientes e sombras). Nenhuma cor hardcoded em componente.

## 2. Reorganização da parte inicial

Ordem nova (mobile e desktop):

```text
Banner (mais baixo, com CTA e selo de PIX)
Pills de categoria  ← sobem para logo abaixo do banner
Busca (compacta, inline)         [botão "Catálogo completo" removido]
MAIS JOGADOS AGORA (ranked)
CRASH GAMES
CASSINO AO VIVO
SLOTS
Provedores
```

- Remoção do botão "Catálogo completo"; o acesso ao catálogo continua no "Ver mais" de cada trilha, na sidebar e no menu.
- Busca vira campo único e mais discreto (altura menor, ícone integrado), sem ocupar uma faixa inteira.
- Barra de confiança fina abaixo do banner: PIX na hora, 18+, jogo responsável, suporte 24h — reforço de credibilidade e conversão.

## 3. Layout das trilhas (partições)

- Cabeçalho de trilha com ícone dentro de um chip colorido da categoria, título em fonte display e linha de brilho sutil separando as seções.
- No mobile as trilhas viram carrossel horizontal com snap (uma linha, arrasta pro lado) em vez de grid de 3 colunas cortado — mais jogo visível e navegação natural no dedo.
- No desktop mantém grid, mas com 1 linha por trilha + "Ver mais" (menos scroll morto).
- Contagem de jogos ao lado do título ("128 jogos").

## 4. Card de jogo com mais dopamina

- Borda que acende na cor da categoria no hover/toque, com leve elevação.
- Overlay de play com escala + brilho no press (feedback tátil no mobile).
- Badge "HOT" / "AO VIVO" quando aplicável; ranking 1–3 em destaque dourado, 4+ discreto.
- Nome e provedor com melhor contraste (gradiente inferior mais definido).
- Skeleton com shimmer no lugar do bloco cinza estático.

## 5. Mobile caprichado

- Banner com altura correta em 390px (sem letras cortadas), indicadores maiores.
- Pills com scroll snap e área de toque de 44px.
- Bottom nav com item central em destaque e realce ativo animado.
- Espaçamentos revisados para não haver corte lateral nos carrosséis (padding negativo controlado).
- Respeito a `prefers-reduced-motion` em todas as animações.

## 6. Aba de cadastro (foco em conversão)

Hoje o dialog de registro ainda usa o estilo antigo (fundo `brand`, painel lateral do escudo) e não combina com o novo design.

- Painel lateral reformulado: fundo com gradiente da marca, escudo, headline de bônus e 3 provas rápidas (PIX em segundos, saque 24h, +5.000 jogos). Só no desktop.
- Formulário refeito com os tokens novos: campos mais altos, ícones alinhados, foco visível, mensagens de erro inline por campo (CPF, e-mail, telefone, senha) em vez de só toast.
- Medidor de força de senha e regra mínima explícita.
- Indicador de progresso enxuto e CTA único grande ("Criar conta e receber bônus"), com estado de loading.
- Mobile: tela cheia, sem scroll travado, teclado não cobre o CTA, campos com `inputMode` correto (numérico para CPF/telefone).
- Selo de segurança e link de termos discretos no rodapé do form.
- Login dialog recebe o mesmo tratamento visual para não ficar destoando.

## Detalhes técnicos

- `src/styles.css`: novos tokens de accent por categoria, gradientes, sombras, utilitários `glow-*`, `shimmer`, `press`, chips de categoria, e guarda de `prefers-reduced-motion`.
- `src/routes/index.tsx`: nova ordem das seções, remoção do botão de catálogo, trilhas com carrossel no mobile e metadados de contagem.
- `src/components/casino/pf-game-card.tsx`: variação de accent por categoria, badges, ranking, press state.
- `src/components/casino/category-pills.tsx`, `banner-carousel.tsx`, `provider-strip.tsx`: refino visual e mobile.
- Novo `src/components/casino/rail.tsx` para as trilhas (grid no desktop, snap-scroll no mobile) e um componente de barra de confiança.
- `src/components/auth/register-dialog.tsx`, `login-dialog.tsx`, `promo-side.tsx`: redesign completo com os tokens novos.
- `src/components/layout/mobile-bottom-nav.tsx`: realce ativo e item central.
- Sem mudanças de backend, de regras de aposta, de gateways ou de dados. Nenhuma alteração de lógica de negócio.

## Verificação

- Typecheck do projeto.
- Screenshots em 390px e 1280px da home e do cadastro, comparando antes/depois.
- Conferência de contraste do texto sobre os novos gradientes.
