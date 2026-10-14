import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/depositos")({
  head: () => ({ meta: pageMeta('Depósitos administrativos — apostamaxy', 'Depósitos administrativos da apostamaxy. Área de gestão autorizada.') }),
  component: () => <TransactionsTable title="Depósitos" type="deposit" />,
});
