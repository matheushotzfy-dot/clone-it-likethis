## Visão geral

Clone visual do site PixBet **para estudo**, com auth funcional via Lovable Cloud, perfil de usuário, e todas as principais abas/seções. Marca renomeada para `PIXBET (Clone Demo)` com aviso de "projeto de estudo, não oficial" para reduzir risco de violação de marca registrada.

Vai sair em uma resposta longa, mas tudo já configurado e navegável.

---

## 1. Backend (Lovable Cloud)

- Ativar Lovable Cloud.
- Auth email/senha (auto-confirm ativado pra não precisar verificar email).
- Tabela `profiles` (id, username, full_name, avatar_url, balance, created_at) ligada a `auth.users` via trigger.
- Tabela `user_roles` (padrão de segurança) + função `has_role`.
- Tabela `transactions` (depósitos/saques mockados pra exibir histórico).
- RLS em tudo, GRANTs corretos, trigger `handle_new_user`.

## 2. Estrutura de rotas

```
/                       Home (cassino destaques)
/esportes               Listagem de esportes/ligas
/cassino                Grid completo de jogos
/ao-vivo                Cassino ao vivo
/torneios               Torneios
/promocoes              Promoções
/indique-amigos         Programa de indicação
/login                  Tela de login
/registro               Tela de cadastro
/_authenticated/perfil           Dados do usuário
/_authenticated/deposito         Depósito (mock PIX)
/_authenticated/saque            Saque (mock)
/_authenticated/historico        Histórico de transações
/_authenticated/apostas          Minhas apostas
/legal/termos, /legal/privacidade, /legal/jogo-responsavel
```

## 3. Componentes globais

- **Header**: logo, navegação principal, ícone presente, botões Entrar/Registrar (ou avatar+saldo quando logado), dropdown de perfil.
- **Sidebar colapsável** (shadcn sidebar): atalhos para Missões, Torneios, Resgatar, Roleta, Bolões, ligas esportivas, jogos populares.
- **Footer rico**: 4 colunas de links legais, ícones de pagamento (PIX, +18, Reclame Aqui placeholders), aviso de jogo responsável, copyright.
- **Modais Login/Registro** acessíveis de qualquer página (além das rotas dedicadas).

## 4. Home / Cassino

- Carrossel de banners promocionais (embla-carousel, autoplay).
- Categorias circulares (Slots, Crash, Popok, Tada, Drops, Promoções, Mesas, JetX).
- Barra de busca + filtro por provedor.
- Carrossel horizontal de provedores (PG Soft, Pragmatic, Evolution, Spribe, Hacksaw, Smartsoft, BGaming, TaDa).
- "Top 10" com numeração grande estilizada atrás de cada card.
- Seções: Slots, Crash, Mesas Brasileiras, Ao Vivo, Lançamentos — cada uma com botão "Ver mais" e grid responsivo.
- ~60 cards de jogos com capas (imagens geradas/placeholders consistentes — não vou puxar do CDN deles pra não quebrar e por questão de direitos).

## 5. Perfil / Área logada

- Dashboard com saldo, bônus, KYC status (mock).
- Edição de perfil (nome, avatar via upload no Storage).
- Depósito: form com valor + QR code PIX gerado (placeholder); cria transação `pending`.
- Saque: form com valor + chave PIX.
- Histórico: tabela das transações do usuário.
- Logout funcional.

## 6. Esportes / Outras abas

- Esportes: lista de ligas (mock) com odds estáticas de exemplo, layout fiel.
- Ao Vivo: grid de partidas mockadas.
- Torneios/Promoções/Indique: páginas com banners + cards explicativos.

## 7. Design system

Tokens em `src/styles.css` (oklch):
- Fundo: azul-marinho muito escuro
- Superfície: azul levemente mais claro
- Primary: verde-limão neon (CTA principal)
- Accent: azul ciano (links/destaques)
- Destructive: vermelho
- Tipografia: Inter (sans moderna, próxima da usada no original)

Sem cores hard-coded nos componentes — tudo via tokens.

## 8. Avisos legais / IP

- Banner pequeno fixo no topo do footer: "Projeto de demonstração — não afiliado a PixBet/NSX Enterprise".
- Logo redesenhada (texto "PIXBET" com pixel verde-limão genérico, não a oficial).
- Sem usar imagens diretamente do CDN deles.

---

## Detalhes técnicos

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase).
- **Imagens de jogos**: vou gerar ~12 capas representativas com `imagegen` (slots, crash, mesa) e reutilizar — barato e consistente. Banners do hero também gerados.
- **Auth**: `supabase.auth.signUp/signInWithPassword`, listener `onAuthStateChange` no root, `_authenticated` layout com `beforeLoad` redirect.
- **Server fns**: `getMyProfile`, `updateProfile`, `createDeposit`, `createWithdrawal`, `listTransactions` — todos com `requireSupabaseAuth`.
- **Validação**: Zod em todos os forms (client + server).
- **Storage bucket**: `avatars` (público).

## Ordem de execução

1. Ativar Cloud + migrations (profiles, user_roles, transactions, trigger, storage bucket).
2. Design tokens em `styles.css`.
3. Layout base: Header, Sidebar, Footer, root com Outlet.
4. Auth: rotas `/login`, `/registro`, modais, hook `useAuth`, listener.
5. `_authenticated` guard + páginas de perfil/depósito/saque/histórico.
6. Gerar imagens (banners + capas).
7. Home com todas as seções.
8. Páginas de Esportes/Cassino/Ao Vivo/Torneios/Promoções/Indique.
9. Páginas legais.
10. Polimento responsivo (mobile-first).

Vai ser uma resposta longa (muitos arquivos), mas sai tudo de uma vez como você pediu.