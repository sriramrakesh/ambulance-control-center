import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ambulances = pgTable("ambulances", {
  id: serial("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  status: text("status").notNull(), // 'available', 'responding', 'en-route'
  speed: integer("speed").notNull(),
});

export const trafficLights = pgTable("traffic_lights", {
  id: serial("id").primaryKey(),
  intersection: text("intersection").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  status: text("status").notNull(), // 'red', 'yellow', 'green'
  overrideActive: boolean("override_active").default(false).notNull(),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  availableBeds: integer("available_beds").notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // 'info', 'warning', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAmbulanceSchema = createInsertSchema(ambulances).omit({ id: true });
export const insertTrafficLightSchema = createInsertSchema(trafficLights).omit({ id: true });
export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });

export type Ambulance = typeof ambulances.$inferSelect;
export type InsertAmbulance = z.infer<typeof insertAmbulanceSchema>;

export type TrafficLight = typeof trafficLights.$inferSelect;
export type InsertTrafficLight = z.infer<typeof insertTrafficLightSchema>;

export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
