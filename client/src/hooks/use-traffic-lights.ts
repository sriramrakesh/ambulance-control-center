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

export function useTrafficLights() {
  return useQuery({
    queryKey: [api.trafficLights.list.path],
    queryFn: async () => {
      const res = await fetch(api.trafficLights.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch traffic lights");
      const data = await res.json();
      return parseWithLogging(api.trafficLights.list.responses[200], data, "trafficLights.list");
    },
    // Poll every 1 second to catch real-time signal changes and overrides
    refetchInterval: 1000,
  });
}
