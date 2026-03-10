import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useAnalytics() {
  return useQuery({
    queryKey: [api.analytics.get.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      return parseWithLogging(api.analytics.get.responses[200], data, "analytics.get");
    },
    refetchInterval: 15000, // Refresh analytics every 15s
  });
}
