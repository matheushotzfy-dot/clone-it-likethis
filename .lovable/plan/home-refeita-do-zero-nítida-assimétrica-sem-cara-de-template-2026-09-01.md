# Home refeita do zero — nítida, assimétrica, sem cara de template

A home atual empilha blocos genéricos (banner → cards de "PIX na hora" → pills → busca → trilhos com badges coloridos). É isso que dá o aspecto de card gerado. Vou refazer a página inicial inteira com uma estrutura assimétrica, arte de jogo grande e limpa, e zero enfeite decorativo.

Escolhas fixadas: azul royal `#0c1430` / `#16224a` com dourado `#f0b429`, texto `#e9eefb`, tipografia Sora (títulos) + Manrope (corpo), layout assimétrico 60/40.

## Estrutura nova (desktop)

```text
┌──────────────────────────────────┬──────────────────┐
│ HERO 60%                         │ COLUNA 40%       │
│ arte grande, título Sora,        │ - Destaque do dia│
│ 1 CTA dourado, sem selos         │ - Top 5 ranking  │
│                                  │   (lista, não    │
│                                  │    card)         │
├──────────────────────────────────┴──────────────────┤
│ FILTRO: nav de categorias em texto + busca inline   │
├─────────────────────────────────────────────────────┤
│ TRILHO 1 — grade nítida, sem badges soltos          │
│ TRILHO 2 ... (Crash / Ao Vivo / Slots)              │
├─────────────────────────────────────────────────────┤
│ Provedores em linha monocromática                   │
└─────────────────────────────────────────────────────┘
```

Mobile: hero em altura contida, ranking top 5 como lista numerada logo abaixo, categorias em uma linha de texto com sublinhado ativo (sem pílulas), trilhos em carrossel com snap e arte maior (2,2 cards visíveis).

## O que sai

- Cards "PIX na hora / Saque 24h / Suporte" (trust bar em caixinhas) — vira uma linha fina de texto no rodapé do hero.
- Pílulas arredondadas coloridas de categoria — viram nav em texto com indicador.
- Badges "HOT", "EM ALTA", "Ao vivo" espalhados sobre a arte — só o ranking numérico fica, e apenas no trilho de mais jogados.
- Chips com ícone em quadradinho colorido nos títulos de seção — título passa a ser texto puro com hairline.
- Glows/blur de fundo e gradientes borrados.

## Linguagem visual "nítida / 4k"

- Raio de borda pequeno e consistente (8px), nada de `rounded-2xl`.
- Hairlines de 1px em `#ffffff14` no lugar de sombras difusas; separadores retos entre seções.
- Arte de jogo sem overlay pesado: gradiente inferior curto só onde tem texto, imagem em `object-cover` nítida, `sizes` correto para não escalar borrado em telas 2x/3x.
- Hover liso: elevação de 2px + hairline dourada + zoom mínimo (1.02), transição 180ms. Play overlay discreto, sem círculo grande.
- Dourado usado com parcimônia: CTA principal, ranking 1–3 e estado ativo. Nada de cor por categoria.
- Tipografia com hierarquia clara: seção em Sora 13px uppercase tracking largo, nome do jogo em Manrope 12px semibold, provedor em 11px muted.

## Detalhes técnicos

- `src/routes/index.tsx`: reescrito com hero assimétrico, coluna de destaque + top 5, nav de categorias em texto, busca inline e trilhos.
- Novos componentes em `src/components/casino/`: `home-hero.tsx` (hero 60/40 + coluna lateral), `top-list.tsx` (ranking em lista), `section-head.tsx` (título + hairline + "ver mais" em texto).
- `game-rail.tsx`: refeito sem chip de ícone colorido, sem contagem de jogos, snap-scroll mobile com arte maior; desktop em grade de 7/9 colunas.
- `pf-game-card.tsx`: remove accents por categoria e badges; mantém ranking opcional, ganha hover liso e skeleton discreto.
- `category-pills.tsx` → nav de texto; `trust-bar.tsx` → linha fina de texto (ou removido do fluxo principal).
- `src/styles.css`: token `--accent-gold: #f0b429`, hairline, raio 8px, utilitário de hover liso; remoção dos tokens `--accent-hot/crash/live` e do `app-glow`.
- Sem mudança de dados, de hooks de jogos, de auth ou de backend — só apresentação da home e componentes que ela usa.

## Verificação

- Typecheck.
- Screenshots em 393px e 1280px, conferindo hero sem corte, trilhos sem vazamento lateral e contraste do dourado sobre o azul.
