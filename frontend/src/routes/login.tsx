import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: appRoute("login") as any, search });
  },
});
