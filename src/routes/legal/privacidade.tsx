import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
import { LegalDoc, LegalSection } from "@/components/legal/legal-doc";
import { usePublicSettings } from "@/hooks/use-account";

export const Route = createFileRoute("/legal/privacidade")({
  head: () => ({
    meta: pageMeta(
      "Política de Privacidade | apostamaxy",
      "Quais dados pessoais tratamos, para quê, com quem compartilhamos e como exercer seus direitos.",
    ),
  }),
  component: Privacy,
});

function Privacy() {
  const s = usePublicSettings().data;
  const dpo = s?.support?.ouvidoria || s?.support?.email;
  return (
    <LegalDoc
      versioned
      title="Política de Privacidade"
      intro={
        <p>
          Esta política explica como tratamos seus dados pessoais, de acordo com a Lei Geral de
          Proteção de Dados (Lei 13.709/2018). Você autoriza esse tratamento no cadastro, em um
          aceite separado dos Termos de Uso.
        </p>
      }
    >
      <LegalSection title="Dados que tratamos">
        <ul>
          <li>
            Cadastro: nome, CPF, data de nascimento, nacionalidade, endereço, e-mail e celular.
          </li>
          <li>Verificação de identidade: foto do documento e selfie.</li>
          <li>Acesso: endereço IP, navegador, data e hora de cada entrada.</li>
          <li>Movimentação: depósitos, saques, apostas, prêmios, limites e pausas.</li>
          <li>Atendimento: mensagens trocadas com o suporte e a ouvidoria.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <ul>
          <li>Abrir e manter a conta e processar depósitos, saques e apostas.</li>
          <li>
            Confirmar sua identidade e idade e impedir o acesso de pessoas proibidas de apostar.
          </li>
          <li>
            Cumprir obrigações legais: prevenção à lavagem de dinheiro, prestação de informações ao
            Ministério da Fazenda e à Receita Federal, e jogo responsável.
          </li>
          <li>Prevenir fraude e proteger a sua conta.</li>
          <li>
            Enviar comunicações de marketing, só se você autorizar, com opção de sair a qualquer
            momento.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Com quem compartilhamos">
        <p>Só com quem precisa dos dados para essas finalidades:</p>
        <ul>
          <li>
            Ministério da Fazenda, COAF, Receita Federal e outras autoridades, quando a lei exigir;
          </li>
          <li>instituições de pagamento que processam o Pix;</li>
          <li>serviços de verificação de identidade e de prevenção a fraude;</li>
          <li>estúdios de jogos, apenas o identificador da conta necessário para a rodada;</li>
          <li>
            empresas de hospedagem e tecnologia contratadas, sob contrato de confidencialidade.
          </li>
        </ul>
        <p>Não vendemos dados pessoais.</p>
      </LegalSection>

      <LegalSection title="Por quanto tempo guardamos">
        <p>
          Enquanto a conta estiver aberta e, depois do encerramento, pelo prazo exigido pela
          regulação de apostas e pela lei de prevenção à lavagem de dinheiro (no mínimo cinco anos).
          Depois disso os dados são apagados ou anonimizados.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Você pode pedir confirmação de tratamento, acesso, correção, portabilidade, informação
          sobre compartilhamento e revogação do consentimento de marketing. Alguns dados não podem
          ser apagados antes do prazo legal, mesmo a pedido. Para exercer seus direitos, fale com o
          encarregado de dados
          {dpo ? (
            <>
              {" "}
              pelo e-mail <strong className="font-semibold">{dpo}</strong>
            </>
          ) : null}{" "}
          ou pelo{" "}
          <Link to="/atendimento" className="font-semibold text-primary underline">
            atendimento
          </Link>
          . Você também pode recorrer à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="Segurança e cookies">
        <p>
          Os dados trafegam criptografados e o acesso interno é restrito e registrado. Usamos
          cookies necessários para manter você conectado e, com sua autorização, cookies de medição
          de campanhas.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
