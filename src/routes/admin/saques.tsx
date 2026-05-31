import { createFileRoute } from "@tanstack/react-router";
import { TransactionsTable } from "@/components/admin/transactions-table";

export const Route = createFileRoute("/admin/saques")({
  component: () => <TransactionsTable title="Saques" type="withdrawal" />,
});
