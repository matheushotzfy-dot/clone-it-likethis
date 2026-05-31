import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/depositos")({
  component: () => <TransactionsTable title="Depósitos" type="deposit" />,
});
