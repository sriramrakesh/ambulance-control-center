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

export function useHospitals() {
  return useQuery({
    queryKey: [api.hospitals.list.path],
    queryFn: async () => {
      const res = await fetch(api.hospitals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hospitals");
      const data = await res.json();
      return parseWithLogging(api.hospitals.list.responses[200], data, "hospitals.list");
    },
    // Static locations, no need to poll aggressively
    staleTime: 60000,
  });
}
