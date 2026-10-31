# Roadmap

## Mensuração Meta do cassino
- [ ] Definir acesso à Meta para a instalação — conexão pelo chat foi recusada; alternativa com token exige confirmação e formulário seguro
- [x] Conferir conexão Meta disponível e explicar atribuição entre quiz e cassino — nenhuma conexão acessível neste projeto
- [ ] Inspecionar permissões e restrições do Pixel solicitado — depende de conexão Meta
- [ ] Instalar PageView, cadastro concluído e primeiro depósito aprovado, com deduplicação e bloqueio regional — depende de verificações e consentimento para identificadores
- [ ] Atualizar política, validar eventos de teste e publicar cassino — depende da instalação; quiz exige acesso ao outro projeto

## Compactação mobile
- [x] Diminuir faixa esportiva e ajustar espaçamentos somente no celular
- [x] Conferir navegação, busca sem zoom automático e preservação do computador — 360/393/430px sem overflow; saldo conectado e depósito abrindo/fechando; cards desktop preservados em 260px

## Mobile estilo aplicativo
- [x] Corrigir fechamento livre do depósito, inclusive com PIX pendente — verificado sem copiar nem pagar
- [x] Harmonizar cadastro, login, saldo e navegação para celular
- [x] Verificar páginas e interações em 360px e 390px — 7 páginas públicas e perfil/histórico/saque sem overflow
- [x] Reconsultar PlayFivers após autorização — agente e carteiras ainda retornam bloqueio por IP

## Conexão PlayFivers atual
- [x] Atualizar credenciais pelo formulário seguro
- [x] Consultar catálogo e verificar credenciais — catálogo respondeu; agente bloqueado por IP
- [x] Proteger callbacks de saldo e transação — 6 testes passaram; chamadas sem credenciais retornam 401
- [ ] Validar lançamento real — depende de IP autorizado e callback autenticado no provedor
- [ ] Confirmar autenticação do callback BALANCE com PlayFivers — documentação não inclui credenciais nesse retorno; acesso permanece bloqueado sem autenticação
- [ ] Habilitar reembolsos — depende de contrato confirmado para reconciliar a rodada original sem crédito duplicado

## Cobertura esportiva e capas
- [x] Ampliar campeonatos brasileiros disponíveis na fonte atual
- [x] Usar apenas odds publicadas, sem estimativas ou odds antigas ao vivo
- [x] Conferir atualização e filtros no computador e celular
- [x] Conferir acesso às capas da referência e corrigir capas recuperáveis
- [ ] Validar catálogo completo e lançamento de slots — bloqueado pelo 403 da PlayFivers
- [ ] Habilitar odds ao vivo para todas as partidas — depende de fornecedor com mercados in-play

- [x] Carregar e remover duplicados do catálogo completo de jogos
- [x] Adicionar diagnóstico do catálogo ao painel administrativo
- [x] Configurar a conta administrativa sem salvar a senha no código
- [x] Aplicar a marca apostamaxy, logo, banners e ícone do site
- [x] Unificar a experiência visual do depósito com o restante do site
- [x] Conferir a página inicial em celular e computador

## Reformulação aprovada
- [x] Aplicar tema grafite e azul-claro, menus e categorias compactos
- [x] Criar banners próprios e aproximar os jogos do topo
- [x] Harmonizar catálogo, conta, PIX e navegação móvel
- [x] Verificar páginas públicas, cadastro, seleção de PIX e metadados
- [x] Aplicar atualização de segurança dos pacotes

Verificação: sem overflow em 360px e desktop; cadastro valida campos; seleção de PIX não gera cobrança; build automático OK. A integração PlayFivers ainda retorna 403 no servidor para provedores, e algumas artes externas usam fallback; lançamento de jogos não foi validado.- [x] Início no estilo stake.com/pt (atalhos Cassino/Esportes no topo)
