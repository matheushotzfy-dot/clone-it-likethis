# Apostamaxy — inspiração BC.Game, identidade brasileira

## Direção visual
Adotar a organização compacta da BC.Game, sem copiar sua marca: fundo grafite escuro, azul-claro luminoso nos botões e estados ativos, texto nítido e imagens dos jogos como protagonistas. Manter o nome **apostamaxy** e a logo antiga solicitada anteriormente.

A referência foi consultada por imagem e conteúdo. A imagem apresentou um aviso regional sobreposto, portanto a proposta usa a estrutura visível da página, não pressupõe acesso a todas as telas ou funções internas.

## O que será reformulado
1. **Topo e lateral:** navegação compacta, ícones consistentes, busca acessível e área de saldo bem legível; depósito e saque com hierarquia clara. Lateral agrupada por jogos e conta, sem repetir opções desnecessariamente.
2. **Página inicial:** banner mais baixo, feito para apostamaxy, com categorias imediatamente abaixo e jogos aparecendo cedo. Manter fotos normais em grades densas de Mais jogados, Crash, Slots e Ao vivo — sem transformar jogos em listas textuais ou encher a página de caixas decorativas.
3. **Categorias e catálogo:** barra de seleção com ícone e nome, destaque azul-claro na opção ativa, busca e filtros com o mesmo acabamento. Harmonizar tamanho das capas, títulos, provedores e controles de carregamento.
4. **Acabamento:** efeitos curtos de iluminação, realce e pressão nos controles; contraste equilibrado, sem excesso de brilho, fundos nebulosos ou animações pesadas. Novos banners próprios, sem pessoas, marcas ou ofertas copiadas da referência.
5. **Celular:** topo compacto sem cortar saldo ou logo, categorias roláveis, lateral recolhível, controles confortáveis ao toque e navegação inferior coordenada com o restante. Verificar telas pequenas e grandes.
6. **Conta e PIX:** harmonizar visualmente login, cadastro e depósito com o novo azul-claro, preservando suas etapas e funcionamento. Alinhar rodapé e demais páginas públicas ao mesmo estilo.

## Limites do trabalho
- Português brasileiro, valores em reais e pagamentos PIX. Não adicionar criptomoedas, tokens, conversão cambial ou carteiras cripto.
- Não importar jogos exclusivos da BC.Game, apostas esportivas ou outras modalidades que não estejam disponíveis na plataforma.
- Não inventar vitórias recentes, jogadores online, jackpots, bônus ou promessas de pagamento.
- Preservar contas, saldos, documentos, configurações administrativas, gateways, limites e regras de KYC. Não apagar dados nem alterar permissões.
- Não publicar sem solicitação.

## Implementação técnica
- Reutilizar o `SiteShell`, navegação, componentes de catálogo e controles existentes; concentrar cores e efeitos nos tokens de `src/styles.css`.
- Aplicar o novo acabamento às páginas e diálogos existentes, sem alterar integrações de jogos ou pagamentos. Manter cache e carregamento incremental; não baixar o catálogo inteiro para exibir a primeira tela.
- Usar imagens locais otimizadas, dimensões estáveis e carregamento adiado fora da primeira tela. Respeitar preferência por movimento reduzido.
- Preservar títulos e metadados próprios de cada página; registrar decisões estruturais e preferências aprovadas durante a implementação.

## Validação e entrega
- Conferir início, categorias, busca, filtros, abertura dos diálogos e navegação entre páginas no computador e celular.
- Testar a área de saldo com uma sessão autorizada quando disponível, sem executar pagamentos reais.
- Verificar fotos, repetições, cortes, erros e legibilidade nas telas afetadas; problemas externos de imagens ou lançamento de jogos serão relatados separadamente, sem esconder jogos como solução visual.
- Entregar o site reformulado e um resumo do que foi validado e de eventuais bloqueios externos.