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

export function useAmbulances() {
  return useQuery({
    queryKey: [api.ambulances.list.path],
    queryFn: async () => {
      const res = await fetch(api.ambulances.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ambulances");
      const data = await res.json();
      return parseWithLogging(api.ambulances.list.responses[200], data, "ambulances.list");
    },
    // Poll every 1 second to simulate live GPS tracking
    refetchInterval: 1000,
  });
}
