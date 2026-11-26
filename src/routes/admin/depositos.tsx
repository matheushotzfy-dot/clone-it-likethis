import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/components/admin/payments-page";

export const Route = createFileRoute("/admin/depositos")({
  head: () => ({ meta: [{ title: "Depósitos | admin" }] }),
  component: () => <PaymentsPage type="deposit" />,
});
