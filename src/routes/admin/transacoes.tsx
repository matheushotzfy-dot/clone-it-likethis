import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/transacoes")({
  component: () => <TransactionsTable title="Todas as transações" type="all" />,
});
