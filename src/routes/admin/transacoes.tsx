import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/transacoes")({
  head: () => ({ meta: pageMeta('Transações administrativas — apostamaxy', 'Transações administrativas da apostamaxy. Área de gestão autorizada.') }),
  component: () => <TransactionsTable title="Todas as transações" type="all" />,
});
