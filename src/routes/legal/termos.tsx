import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
import { LegalDoc, LegalSection } from "@/components/legal/legal-doc";

export const Route = createFileRoute("/legal/termos")({
  head: () => ({
    meta: pageMeta(
      "Termos de Uso | apostamaxy",
      "Regras da conta, depósitos, saques, apostas, jogo responsável e atendimento.",
    ),
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalDoc
      versioned
      title="Termos de Uso"
      intro={
        <p>
          Estes termos explicam como funciona a sua conta e o que cada lado se compromete a fazer.
          Ao criar a conta você declara que leu e aceita este texto. Quando ele mudar, pedimos um
          novo aceite antes de você voltar a jogar.
        </p>
      }
    >
      <LegalSection title="1. Quem pode ter conta">
        <p>
          Para abrir conta é preciso ser maior de 18 anos, ter CPF regular e morar no Brasil. Não
          podem apostar:
        </p>
        <ul>
          <li>sócios, dirigentes e funcionários da operadora, e seus parentes próximos;</li>
          <li>agentes públicos que atuam na regulação ou fiscalização de apostas;</li>
          <li>
            atletas, árbitros, técnicos, dirigentes e outras pessoas que possam influenciar o
            resultado de um evento;
          </li>
          <li>pessoas com diagnóstico de jogo compulsivo ou com autoexclusão ativa;</li>
          <li>quem estiver impedido por lei ou pela regulação do Ministério da Fazenda.</li>
        </ul>
        <p>
          Cada pessoa pode ter uma única conta. Contas duplicadas ou em nome de outra pessoa são
          encerradas.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e verificação de identidade">
        <p>
          No cadastro pedimos nome completo, CPF, data de nascimento, nacionalidade, endereço,
          e-mail e celular. Antes do primeiro depósito ou aposta, você envia um documento oficial
          com foto e uma selfie segurando o documento. Enquanto a verificação não for aprovada, a
          conta não deposita nem aposta.
        </p>
        <p>
          Os dados precisam ser verdadeiros e ficar atualizados. Podemos pedir documentos de novo a
          qualquer momento para prevenir fraude e lavagem de dinheiro.
        </p>
      </LegalSection>

      <LegalSection title="3. Acesso e segurança">
        <ul>
          <li>
            A senha precisa ter 8 caracteres ou mais, com letras, números e um caractere especial.
          </li>
          <li>
            Depois de 3 senhas erradas seguidas a conta é bloqueada. Para desbloquear, crie uma
            senha nova pelo link enviado ao seu e-mail.
          </li>
          <li>
            A cada entrada mostramos a data e a hora do acesso anterior. Se não reconhecer, troque a
            senha e fale com o atendimento.
          </li>
          <li>Não compartilhe a conta nem a senha. Você responde pelo que for feito com elas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Depósitos e saques">
        <ul>
          <li>
            Depósitos e saques são feitos só por Pix, a partir de uma conta no seu CPF e para a
            chave CPF do titular.
          </li>
          <li>
            Não aceitamos dinheiro em espécie, boleto, cartão de crédito, criptoativos nem
            pagamentos de terceiros.
          </li>
          <li>
            Os valores mínimo e máximo e a taxa de saque, se houver, aparecem na tela antes de você
            confirmar.
          </li>
          <li>
            Ao pedir um saque o valor sai do saldo e fica reservado. Se o saque for recusado, ele
            volta para o saldo com o motivo informado.
          </li>
          <li>Não oferecemos crédito, empréstimo nem adiantamento de valores para apostar.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Apostas e jogos">
        <ul>
          <li>Uma aposta só vale depois de confirmada na tela e com saldo suficiente.</li>
          <li>
            Apostas esportivas são decididas pelo resultado do tempo normal, salvo regra diferente
            mostrada no mercado. Evento adiado ou cancelado anula a aposta e devolve o valor.
          </li>
          <li>
            Os jogos de cassino são fornecidos por estúdios externos. O retorno teórico ao jogador
            (RTP) informado pelo estúdio aparece na tela do jogo, quando disponível.
          </li>
          <li>
            Em caso de falha técnica comprovada, a rodada afetada é anulada e o valor apostado é
            devolvido.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Jogo responsável">
        <p>
          Você pode definir limites de depósito, de perda, de quantidade de apostas e de tempo,
          fazer uma pausa ou se autoexcluir. Diminuir um limite vale na hora; aumentar vale depois
          de 24 horas. Durante a sessão mostramos o tempo jogado e o resultado do dia. Veja tudo em{" "}
          <Link to="/legal/jogo-responsavel" className="font-semibold text-primary underline">
            Jogo responsável
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Encerramento e suspensão">
        <p>
          Você pode encerrar a conta quando quiser em Minha conta, depois de sacar o saldo. Podemos
          suspender ou encerrar contas em caso de fraude, dados falsos, conta duplicada, uso por
          pessoa impedida ou ordem de autoridade. O saldo legítimo continua disponível para saque.
        </p>
      </LegalSection>

      <LegalSection title="8. Impostos">
        <p>
          Prêmios estão sujeitos ao Imposto de Renda, na forma da lei. O informe com os valores do
          ano fica em Extrato e apostas, na aba Informe anual.
        </p>
      </LegalSection>

      <LegalSection title="9. Atendimento e reclamações">
        <p>
          Dúvidas e reclamações vão para o{" "}
          <Link to="/atendimento" className="font-semibold text-primary underline">
            atendimento
          </Link>
          . Se a resposta não resolver, a ouvidoria revê o caso. Você também pode registrar
          reclamação no consumidor.gov.br e no Procon.
        </p>
      </LegalSection>

      <LegalSection title="10. Mudanças e foro">
        <p>
          Avisamos qualquer mudança nestes termos e pedimos novo aceite antes de você voltar a
          jogar. Aplicam-se as leis brasileiras, e o foro é o do domicílio do apostador.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
