import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/")({
  beforeLoad: () => {
    throw redirect({ to: appRoute("dashboard") as any });
  },
});
