import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { pageMeta } from "@/lib/page-meta";
import { LegalDoc, LegalSection } from "@/components/legal/legal-doc";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/legal/jogo-responsavel")({
  head: () => ({
    meta: pageMeta(
      "Jogo responsável | apostamaxy",
      "Limites, pausa, autoexclusão, autoteste e onde buscar ajuda.",
    ),
  }),
  component: ResponsibleGaming,
});

const QUESTIONS = [
  "Apostou mais do que podia perder?",
  "Precisou apostar valores maiores para sentir a mesma emoção?",
  "Voltou outro dia para tentar recuperar o dinheiro perdido?",
  "Pegou dinheiro emprestado ou vendeu algo para apostar?",
  "Sentiu que pode ter um problema com apostas?",
  "As apostas trouxeram estresse, ansiedade ou problemas de sono?",
  "Alguém disse que você aposta demais, mesmo que você não concorde?",
  "As apostas causaram problemas financeiros para você ou sua família?",
  "Sentiu culpa pelo jeito como aposta ou pelo que acontece quando aposta?",
];
const ANSWERS = ["Nunca", "Às vezes", "Muitas vezes", "Quase sempre"];

function result(score: number) {
  if (score === 0)
    return {
      title: "Sem sinais de risco",
      text: "Suas respostas não mostram sinais de problema. Continue usando limites para manter as apostas como diversão.",
    };
  if (score <= 2)
    return {
      title: "Risco baixo",
      text: "Há alguns sinais de atenção. Defina limites de perda e de tempo e acompanhe o resultado do dia no painel.",
    };
  if (score <= 7)
    return {
      title: "Risco moderado",
      text: "As apostas podem estar trazendo consequências. Faça uma pausa, reduza seus limites e converse com alguém de confiança.",
    };
  return {
    title: "Risco alto",
    text: "As respostas indicam que as apostas podem estar fora de controle. Recomendamos a autoexclusão e procurar ajuda especializada. Você não precisa passar por isso sozinho.",
  };
}

function SelfTest() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [done, setDone] = useState(false);
  const complete = answers.every((a) => a !== null);
  const score = answers.reduce<number>((t, a) => t + (a ?? 0), 0);
  const r = result(score);
  const { user } = useAuth();

  return (
    <div className="rounded-[14px] border border-border bg-surface p-4 md:p-6">
      <p className="mb-4 text-[14.5px] text-muted-foreground">
        Pense nos últimos 12 meses. As respostas ficam só no seu aparelho e não são enviadas.
      </p>
      <ol className="space-y-5">
        {QUESTIONS.map((q, i) => (
          <li key={q}>
            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold">
                {i + 1}. {q}
              </legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {ANSWERS.map((label, v) => (
                  <label
                    key={label}
                    className={cn(
                      "flex h-10 cursor-pointer items-center justify-center rounded-[8px] border text-[13.5px] transition-colors focus-within:ring-2 focus-within:ring-ring",
                      answers[i] === v
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      className="sr-only"
                      checked={answers[i] === v}
                      onChange={() => {
                        setDone(false);
                        setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={!complete}
        onClick={() => setDone(true)}
        className="mt-6 h-11 rounded-[10px] bg-primary px-6 font-bold text-primary-foreground disabled:opacity-50"
      >
        Ver resultado
      </button>
      {done && (
        <div role="status" className="mt-5 rounded-[12px] border border-border bg-background p-4">
          <p className="font-display text-[22px] font-bold">{r.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed">{r.text}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            {user ? (
              <Link
                to="/perfil"
                search={{ aba: "limites" } as never}
                className="font-semibold text-primary underline"
              >
                Definir limites, pausa ou autoexclusão
              </Link>
            ) : null}
            <a
              href="https://www.gov.br/autoexclusaoapostas"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline"
            >
              Autoexclusão em todas as casas
            </a>
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            Este teste é uma orientação e não substitui avaliação profissional.
          </p>
        </div>
      )}
    </div>
  );
}

function ResponsibleGaming() {
  return (
    <LegalDoc
      title="Jogo responsável"
      intro={
        <p>
          Aposta é entretenimento pago, não forma de ganhar dinheiro. A banca tem vantagem no longo
          prazo e perder faz parte do jogo. Aposte só o que você pode perder sem afetar contas,
          família ou trabalho.
        </p>
      }
    >
      <LegalSection title="Ferramentas da sua conta">
        <ul>
          <li>
            <strong className="font-semibold text-foreground">Limites</strong> de depósito e de
            perda por dia, semana e mês, de quantidade de apostas por dia e de tempo por sessão.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Aviso de tempo</strong>: a cada
            intervalo que você escolher, mostramos há quanto tempo você joga e o resultado do dia.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Painel permanente</strong> no topo do
            site com o tempo da sessão e o resultado de hoje.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Pausa</strong> de 24 horas a 30 dias:
            você entra e saca, mas não aposta nem deposita.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Autoexclusão</strong> de 24 horas até
            tempo indeterminado, sem volta antes do fim.
          </li>
        </ul>
        <p>
          Diminuir um limite vale na hora. Aumentar ou remover só vale 24 horas depois. Tudo fica em{" "}
          <Link
            to="/perfil"
            search={{ aba: "limites" } as never}
            className="font-semibold text-primary underline"
          >
            Minha conta, Limites de jogo
          </Link>
          .
        </p>
        <p>
          Para se bloquear em todas as casas autorizadas de uma vez, use a{" "}
          <a
            href="https://www.gov.br/autoexclusaoapostas"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline"
          >
            autoexclusão centralizada do governo <ExternalLink className="size-3.5" />
          </a>
          , com a conta gov.br.
        </p>
      </LegalSection>

      <LegalSection title="Sinais de alerta">
        <ul>
          <li>Apostar para recuperar o que perdeu.</li>
          <li>Esconder de outras pessoas quanto aposta ou quanto perdeu.</li>
          <li>Usar dinheiro de contas, aluguel ou comida, ou pegar emprestado para apostar.</li>
          <li>Ficar irritado ou ansioso quando não está apostando.</li>
          <li>Perder a noção do tempo ou deixar de lado trabalho, estudo e família.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Autoteste">
        <SelfTest />
      </LegalSection>

      <LegalSection title="Onde buscar ajuda">
        <ul>
          <li>
            <strong className="font-semibold text-foreground">
              CAPS e unidades básicas do SUS
            </strong>
            : atendimento gratuito para dependência, inclusive de jogo.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Jogadores Anônimos</strong>: grupos de
            apoio gratuitos, presenciais e online.
          </li>
          <li>
            <strong className="font-semibold text-foreground">CVV, telefone 188</strong>: apoio
            emocional gratuito, todos os dias, 24 horas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Menores de idade">
        <p>
          Apostas são proibidas para menores de 18 anos. Conferimos CPF, idade e identidade com foto
          antes do primeiro depósito. Se crianças usam o mesmo aparelho, ative o controle parental
          do sistema e não salve a senha da conta no navegador.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
