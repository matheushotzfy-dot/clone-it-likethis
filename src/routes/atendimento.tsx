import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Mail, MessageCircle, Scale } from "lucide-react";
import { pageMeta } from "@/lib/page-meta";
import { LegalDoc, LegalSection } from "@/components/legal/legal-doc";
import { usePublicSettings } from "@/hooks/use-account";

export const Route = createFileRoute("/atendimento")({
  head: () => ({
    meta: pageMeta(
      "Atendimento e ouvidoria | apostamaxy",
      "Canais de atendimento, ouvidoria e como registrar uma reclamação.",
    ),
  }),
  component: Support,
});

function waLink(n: string) {
  const d = n.replace(/\D/g, "");
  return d ? `https://wa.me/${d.startsWith("55") ? d : `55${d}`}` : null;
}

function Support() {
  const s = usePublicSettings().data;
  const sup = s?.support;
  const wa = sup?.whatsapp ? waLink(sup.whatsapp) : null;
  return (
    <LegalDoc
      title="Atendimento e ouvidoria"
      intro={
        <p>
          Fale com a gente para tirar dúvidas, pedir ajuda com depósitos e saques, corrigir dados ou
          reclamar. Atendimento gratuito, em português
          {sup?.hours ? `, ${sup.hours.charAt(0).toLowerCase()}${sup.hours.slice(1)}` : ""}.
        </p>
      }
    >
      <LegalSection title="Canais">
        <div className="grid gap-3 sm:grid-cols-2">
          {sup?.email && (
            <a
              href={`mailto:${sup.email}`}
              className="flex items-start gap-3 rounded-[12px] border border-border bg-surface p-4 hover:border-primary/60"
            >
              <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold text-foreground">E-mail</span>
                <span className="block break-all text-[14px]">{sup.email}</span>
              </span>
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-[12px] border border-border bg-surface p-4 hover:border-primary/60"
            >
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold text-foreground">WhatsApp</span>
                <span className="num block text-[14px]">{sup?.whatsapp}</span>
              </span>
            </a>
          )}
        </div>
        {!sup?.email && !wa && <p>Os canais de atendimento estão sendo configurados.</p>}
        <p>
          Para agilizar, escreva do e-mail cadastrado e conte o que aconteceu, com data e valor
          quando for sobre depósito, saque ou aposta.
        </p>
      </LegalSection>

      <LegalSection title="Ouvidoria">
        <p className="flex items-start gap-2.5">
          <Scale className="mt-1 size-5 shrink-0 text-muted-foreground" />
          <span>
            Se o atendimento não resolveu, a ouvidoria revê o caso de forma independente
            {sup?.ouvidoria ? (
              <>
                {" "}
                pelo e-mail{" "}
                <a
                  href={`mailto:${sup.ouvidoria}`}
                  className="font-semibold text-primary underline"
                >
                  {sup.ouvidoria}
                </a>
              </>
            ) : null}
            . Conte o que já foi tratado no atendimento.
          </span>
        </p>
      </LegalSection>

      <LegalSection title="Outras formas de reclamar">
        <ul>
          <li>
            <a
              href="https://www.consumidor.gov.br"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary underline"
            >
              consumidor.gov.br <ExternalLink className="size-3.5" />
            </a>
          </li>
          <li>Procon do seu estado ou cidade.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Resolva sozinho na conta">
        <ul>
          <li>
            <Link to="/historico" className="font-semibold text-primary underline">
              Extrato e apostas
            </Link>
            : todas as movimentações, rodadas e o informe anual.
          </li>
          <li>
            <Link
              to="/perfil"
              search={{ aba: "limites" } as never}
              className="font-semibold text-primary underline"
            >
              Limites de jogo
            </Link>
            : limites, pausa e autoexclusão.
          </li>
          <li>
            <Link
              to="/perfil"
              search={{ aba: "seguranca" } as never}
              className="font-semibold text-primary underline"
            >
              Segurança
            </Link>
            : troca de senha, acessos e encerramento da conta.
          </li>
        </ul>
      </LegalSection>
    </LegalDoc>
  );
}
