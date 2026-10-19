import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: appRoute("results") as any, search });
  },
});
