# VeoPag 100%, fim dos bônus e visual estilo Stake em todo o site

## 1. Pagamentos VeoPag (PIX)
- Guardar o Client ID e o Secret de forma segura no servidor (nunca no código). Recomendação: trocar o secret depois, já que foi colado no chat.
- Revisar a integração existente com base na documentação api.veopag.co/api-docs: autenticação, criação da cobrança PIX (QR code + copia e cola), consulta de status e webhook.
- Webhook: validar a origem, evitar crédito duplicado e aprovar o depósito automaticamente, creditando o saldo na hora.
- Saque via VeoPag, se a API oferecer, mantendo a aprovação pelo admin.
- Deixar a VeoPag como gateway ativo.
- Testes: gerar uma cobrança real de valor mínimo, simular o retorno do webhook e conferir saldo e histórico. Testes automáticos para "crédito uma vez só" e "valor creditado = valor pago".

## 2. Remover todos os bônus
- Tirar o bônus de 100% no primeiro depósito (regra do banco que soma o valor em dobro).
- Remover textos, selos e cartões de bônus do cadastro, depósito, promoções, perfil e admin.
- Saldos e histórico existentes não são alterados.

## 3. Cadastro e menu lateral
- Cadastro: janela mais limpa, sem a lateral de promoção, passos claros e validação de CPF/telefone.
- Menu lateral no estilo Stake: grupos Cassino/Esportes, ícones alinhados, recolher em ícones no computador e gaveta no celular.

## 4. Visual estilo Stake (print enviado) em todas as áreas
- Início: dois cartões grandes, "CASSINO" e "ESPORTES", com as duas artes que você mandou, rodapé "Jogar agora / Apostar agora" e contador; barra de busca larga logo abaixo; fileiras "Jogos para você" e "Jogos populares" com capas em pé e "Carregar mais".
- Cards de jogos: capa vertical arredondada, contador de jogadores com ponto verde embaixo.
- Topo: saldo central com botão "Carteira", ícones de busca, perfil e notificações à direita.
- Mesmo padrão aplicado em Cassino, Slots, Ao Vivo, Crash, Esportes, Promoções, Torneios, Perfil, Depósito/Saque, Login e Admin.

## 5. Fotos dos jogos
- Não consigo abrir a Stake daqui (bloqueio de região). Vou buscar as capas oficiais públicas de cada jogo pelo nome e provedora, sem trocar por capa de outro jogo. Jogos sem capa achada continuam com a arte de reserva.

## Detalhes técnicos
- Secrets `VEOPAG_CLIENT_ID` / `VEOPAG_CLIENT_SECRET`; revisar `src/lib/veopag.functions.ts` e `src/routes/api/public/veopag-webhook.ts`; idempotência por `gateway_external_id`.
- Migration ajustando `apply_transaction_balance` para não gerar bônus; `handle_new_user` sem `bonus_expires_at`.
- Banners enviados viram assets do CDN usados em `hub-tiles.tsx`.
- Testes em vitest ao lado dos existentes.
