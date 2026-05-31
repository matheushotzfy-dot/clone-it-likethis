import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const check = useServerFn(isAdminFn);
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => check(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
    if (data && !data.isAdmin) navigate({ to: "/", replace: true });
  }, [user, loading, data, navigate]);

  if (loading || isLoading || !user || !data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <AdminShell><Outlet /></AdminShell>;
}
