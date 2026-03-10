import { z } from 'zod';
import { 
  insertAmbulanceSchema, ambulances,
  insertTrafficLightSchema, trafficLights,
  insertHospitalSchema, hospitals,
  insertAlertSchema, alerts 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  ambulances: {
    list: {
      method: 'GET' as const,
      path: '/api/ambulances' as const,
      responses: {
        200: z.array(z.custom<typeof ambulances.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/ambulances/:id' as const,
      input: insertAmbulanceSchema.partial(),
      responses: {
        200: z.custom<typeof ambulances.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  trafficLights: {
    list: {
      method: 'GET' as const,
      path: '/api/traffic-lights' as const,
      responses: {
        200: z.array(z.custom<typeof trafficLights.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/traffic-lights/:id' as const,
      input: insertTrafficLightSchema.partial(),
      responses: {
        200: z.custom<typeof trafficLights.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  hospitals: {
    list: {
      method: 'GET' as const,
      path: '/api/hospitals' as const,
      responses: {
        200: z.array(z.custom<typeof hospitals.$inferSelect>()),
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts' as const,
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/alerts' as const,
      input: insertAlertSchema,
      responses: {
        201: z.custom<typeof alerts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  analytics: {
    get: {
      method: 'GET' as const,
      path: '/api/analytics' as const,
      responses: {
        200: z.object({
          activeEmergencies: z.number(),
          averageResponseTime: z.number(),
          intersectionsCleared: z.number(),
          dailyIncidents: z.array(z.object({
            date: z.string(),
            count: z.number(),
          })),
          responseTimeData: z.array(z.object({
            time: z.string(),
            value: z.number(),
          }))
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
