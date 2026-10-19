import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/config")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: appRoute("config") as any, search });
  },
});
