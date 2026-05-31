## Plano

### 1. Login com Email OU CPF
- Atualizar `src/components/auth/login-dialog.tsx`: trocar campo "Email" por "Email ou CPF" (detecta automaticamente — se tiver só números, trata como CPF).
- Criar server function `loginWithIdentifier` em `src/lib/auth.functions.ts`: se input for CPF (11 dígitos), busca o email correspondente na tabela `profiles` (via admin client) e faz signIn com esse email + senha. Se for email, login direto.
- Validação client-side com máscara automática de CPF quando o usuário digita só números.

### 2. Layout do Login (mobile + desktop)
- Reescrever `login-dialog.tsx` e `register-dialog.tsx` com:
  - `DialogContent` em `max-w-md` no mobile (sem `PromoSide` lateral no mobile — só aparece em `md:` pra cima).
  - Padding reduzido, inputs maiores (h-12), botões full-width, espaçamento vertical consistente.
  - Centralização garantida (já está `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`, mas vou remover qualquer wrapper que esteja quebrando).
  - Logo do Santos no topo do dialog em alta qualidade.

### 3. Logo Santos em alta qualidade
- Substituir `src/assets/santos-shield.png` pela imagem anexada (já enviada agora — 400x495 nativo, sem upscale artificial).
- Usar `code--copy user-uploads://Santos_Futebol_Clube_logo_with_stars_and_crown.png src/assets/santos-shield.png`.

### 4. Banners — voltar pro tamanho slim
- Restaurar proporção do banner para **~6.7:1** (igual ao print BGaming, ~1280x190).
- Em `banner-carousel.tsx`: trocar `aspect-[16/9] sm:aspect-[5/2]` por `aspect-[16/5] sm:aspect-[20/3]` (≈6.7:1 desktop, mais alto no mobile pra não ficar minúsculo).
- Gerar 3 novos banners (1920x288) com tema 100% Santos:
  - **Banner 1**: Neymar com camisa preta-e-branca do Santos, fundo Vila Belmiro estilizada, badge "SANTOSBET" + CTA "APOSTE AGORA"
  - **Banner 2**: Endrick + Neymar em composição dinâmica, escudo do Santos, "BÔNUS 100% ATÉ R$500"
  - **Banner 3**: Estádio lotado + escudo + "AO VIVO • CASSINO • ESPORTES"
- Usar `imagegen` com modelo premium pra qualidade fotorrealista dos jogadores.

### Arquivos afetados
- `src/components/auth/login-dialog.tsx` (refazer layout + email/CPF)
- `src/components/auth/register-dialog.tsx` (layout mobile)
- `src/lib/auth.functions.ts` (novo — `loginWithIdentifier`)
- `src/assets/santos-shield.png` (substituir pela imagem anexada)
- `src/assets/banner-santos-1.jpg`, `banner-santos-2.jpg`, `banner-santos-3.jpg` (regenerar)
- `src/components/casino/banner-carousel.tsx` (ajustar aspect ratio slim)

### Nota legal
Gerar imagens de jogadores reais (Neymar, Endrick) com IA pode produzir semelhança imperfeita e tem implicações de direito de imagem. Vou gerar **silhuetas/estilo editorial** de "um craque brasileiro nº 10 com camisa preta-e-branca" — visualmente evocativo do Neymar no Santos sem reproduzir o rosto exato. Se você quiser fotos reais oficiais, melhor me enviar as imagens licenciadas.
