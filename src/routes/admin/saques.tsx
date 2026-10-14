import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/saques")({
  head: () => ({ meta: pageMeta('Saques administrativos — apostamaxy', 'Saques administrativos da apostamaxy. Área de gestão autorizada.') }),
  component: () => <TransactionsTable title="Saques" type="withdrawal" />,
});
