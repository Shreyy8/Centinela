import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    throw redirect({ to: appRoute("profile") as any });
  },
});
