import { db } from "./db";
import {
  ambulances, trafficLights, hospitals, alerts,
  type Ambulance, type InsertAmbulance,
  type TrafficLight, type InsertTrafficLight,
  type Hospital, type InsertHospital,
  type Alert, type InsertAlert
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Ambulances
  getAmbulances(): Promise<Ambulance[]>;
  getAmbulance(id: number): Promise<Ambulance | undefined>;
  createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance>;
  updateAmbulance(id: number, updates: Partial<InsertAmbulance>): Promise<Ambulance | undefined>;
  
  // Traffic Lights
  getTrafficLights(): Promise<TrafficLight[]>;
  getTrafficLight(id: number): Promise<TrafficLight | undefined>;
  createTrafficLight(light: InsertTrafficLight): Promise<TrafficLight>;
  updateTrafficLight(id: number, updates: Partial<InsertTrafficLight>): Promise<TrafficLight | undefined>;
  
  // Hospitals
  getHospitals(): Promise<Hospital[]>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  
  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  
  // Analytics
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getAmbulances(): Promise<Ambulance[]> {
    return await db.select().from(ambulances);
  }

  async getAmbulance(id: number): Promise<Ambulance | undefined> {
    const [amb] = await db.select().from(ambulances).where(eq(ambulances.id, id));
    return amb;
  }

  async createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance> {
    const [created] = await db.insert(ambulances).values(ambulance).returning();
    return created;
  }

  async updateAmbulance(id: number, updates: Partial<InsertAmbulance>): Promise<Ambulance | undefined> {
    const [updated] = await db.update(ambulances)
      .set(updates)
      .where(eq(ambulances.id, id))
      .returning();
    return updated;
  }

  async getTrafficLights(): Promise<TrafficLight[]> {
    return await db.select().from(trafficLights);
  }

  async getTrafficLight(id: number): Promise<TrafficLight | undefined> {
    const [light] = await db.select().from(trafficLights).where(eq(trafficLights.id, id));
    return light;
  }

  async createTrafficLight(light: InsertTrafficLight): Promise<TrafficLight> {
    const [created] = await db.insert(trafficLights).values(light).returning();
    return created;
  }

  async updateTrafficLight(id: number, updates: Partial<InsertTrafficLight>): Promise<TrafficLight | undefined> {
    const [updated] = await db.update(trafficLights)
      .set(updates)
      .where(eq(trafficLights.id, id))
      .returning();
    return updated;
  }

  async getHospitals(): Promise<Hospital[]> {
    return await db.select().from(hospitals);
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    const [created] = await db.insert(hospitals).values(hospital).returning();
    return created;
  }

  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(50);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }
  
  async getAnalytics(): Promise<any> {
    // Return mock analytics data for the dashboard
    return {
      activeEmergencies: 3,
      averageResponseTime: 8.5, // minutes
      intersectionsCleared: 42,
      dailyIncidents: [
        { date: 'Mon', count: 12 },
        { date: 'Tue', count: 15 },
        { date: 'Wed', count: 8 },
        { date: 'Thu', count: 20 },
        { date: 'Fri', count: 18 },
        { date: 'Sat', count: 25 },
        { date: 'Sun', count: 14 }
      ],
      responseTimeData: [
        { time: '00:00', value: 7.2 },
        { time: '04:00', value: 6.5 },
        { time: '08:00', value: 9.1 },
        { time: '12:00', value: 10.5 },
        { time: '16:00', value: 11.2 },
        { time: '20:00', value: 8.8 }
      ]
    };
  }
}

export const storage = new DatabaseStorage();
