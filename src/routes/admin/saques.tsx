import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/components/admin/payments-page";

export const Route = createFileRoute("/admin/saques")({
  head: () => ({ meta: [{ title: "Saques | admin" }] }),
  component: () => <PaymentsPage type="withdrawal" />,
});
