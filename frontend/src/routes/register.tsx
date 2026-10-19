import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/register")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: appRoute("register") as any, search });
  },
});
