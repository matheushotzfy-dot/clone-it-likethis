# apostaya.bet — catálogo, marca e conversão

## Resultado
- Trocar toda a identidade visível para **apostaya.bet**, sem referências ao Santos.
- Manter a direção escolhida: interface escura, nítida, densa e moderna, com acento ciano coerente.
- Carregar o catálogo completo disponível, remover duplicatas de forma consistente e validar filtros, categorias e abertura dos jogos.
- Criar/ajustar com segurança a conta administrativa solicitada, com função de administrador separada da conta comum.
- Melhorar o caminho cadastro → depósito, usando a mesma linguagem visual do site.

## Implementação
1. **Catálogo de jogos**
   - Buscar todos os provedores ativos, com concorrência controlada e cache.
   - Retornar lotes paginados sem refazer todo o catálogo a cada clique.
   - Aplicar uma única regra de deduplicação por código e título normalizado.
   - Exibir falhas parciais claramente e manter fallback somente quando a provedora estiver indisponível.
   - Validar busca, provedores, Slots, Crash, Ao Vivo e abertura dos jogos.

2. **Ligação com painel administrativo**
   - Adicionar uma área de diagnóstico do catálogo no painel: provedores, jogos únicos, duplicatas removidas, falhas e última atualização.
   - Manter lançamentos, saldos e transações ligados aos controles administrativos existentes.
   - Proteger todas as leituras administrativas por autenticação e função de administrador no servidor.

3. **Conta administrativa**
   - Criar ou atualizar `admin@admin.com` com a senha fornecida fora do código-fonte.
   - Garantir a função `admin` na tabela separada de permissões.
   - Remover o reset de senha fixa da migração antiga para evitar nova exposição em futuras instalações.

4. **Nova marca e imagens**
   - Criar símbolo e wordmark próprios de **apostaya.bet**.
   - Gerar banners panorâmicos novos, em alta resolução, sem escudo ou referências ao Santos.
   - Atualizar cabeçalho, menu lateral, rodapé, painel, diálogos e textos/metadados públicos.

5. **Cadastro e depósito**
   - Unificar fundo, bordas, ícones e estados com a paleta principal.
   - Tornar o passo pós-cadastro mais claro e interativo, com valores rápidos, limites reais e PIX em destaque.
   - Preservar os gateways e limites configurados pelo painel.

6. **Verificação**
   - Conferir página inicial, catálogo, filtros, cadastro, login, depósito e painel em desktop e celular.
   - Confirmar ausência de duplicatas visíveis, overflow, erros no console e chamadas com falha.
   - Revisar títulos e descrições de todas as páginas alteradas.

## Observação de segurança
A senha administrativa não será gravada em arquivos ou exibida novamente. A conta será configurada diretamente no sistema de autenticação e a permissão administrativa continuará validada no servidor.
