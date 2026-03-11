import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingAmbulances = await storage.getAmbulances();
  if (existingAmbulances.length === 0) {
    // Seed Ambulances
    await storage.createAmbulance({ vehicleId: "AMB-01", lat: 40.7128, lng: -74.0060, status: "responding", speed: 65 });
    await storage.createAmbulance({ vehicleId: "AMB-02", lat: 40.7282, lng: -73.7949, status: "available", speed: 0 });
    await storage.createAmbulance({ vehicleId: "AMB-03", lat: 40.7488, lng: -73.9857, status: "en-route", speed: 45 });

    // Seed Traffic Lights
    await storage.createTrafficLight({ intersection: "Broadway & Wall St", lat: 40.7077, lng: -74.0119, status: "green", overrideActive: true });
    await storage.createTrafficLight({ intersection: "5th Ave & 34th St", lat: 40.7484, lng: -73.9857, status: "red", overrideActive: false });
    await storage.createTrafficLight({ intersection: "Lexington & 42nd St", lat: 40.7517, lng: -73.9768, status: "yellow", overrideActive: false });
    await storage.createTrafficLight({ intersection: "Park Ave & 59th St", lat: 40.7629, lng: -73.9686, status: "red", overrideActive: false });

    // Seed Hospitals
    await storage.createHospital({ name: "AIIMS Nagpur", lat: 21.1702, lng: 79.0495, availableBeds: 18 });
    await storage.createHospital({ name: "Care Hospitals Nagpur", lat: 21.1415, lng: 79.0820, availableBeds: 11 });
    await storage.createHospital({ name: "Kingsway Hospital", lat: 21.1539, lng: 79.0832, availableBeds: 22 });

    // Seed Alerts
    await storage.createAlert({ title: "Emergency Dispatch", description: "AMB-01 dispatched to severe traffic accident at Broadway & Wall St.", severity: "critical" });
    await storage.createAlert({ title: "Traffic Override", description: "Traffic light override activated for AMB-01 route.", severity: "info" });
    await storage.createAlert({ title: "Hospital Status Update", description: "Mount Sinai Hospital nearing capacity (5 beds remaining).", severity: "warning" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.ambulances.list.path, async (req, res) => {
    const ambulances = await storage.getAmbulances();
    res.json(ambulances);
  });

  app.put(api.ambulances.update.path, async (req, res) => {
    try {
      const input = api.ambulances.update.input.parse(req.body);
      const updated = await storage.updateAmbulance(Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Ambulance not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.trafficLights.list.path, async (req, res) => {
    const lights = await storage.getTrafficLights();
    res.json(lights);
  });

  app.put(api.trafficLights.update.path, async (req, res) => {
    try {
      const input = api.trafficLights.update.input.parse(req.body);
      const updated = await storage.updateTrafficLight(Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Traffic light not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.hospitals.list.path, async (req, res) => {
    const hospitals = await storage.getHospitals();
    res.json(hospitals);
  });

  app.get(api.alerts.list.path, async (req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.post(api.alerts.create.path, async (req, res) => {
    try {
      const input = api.alerts.create.input.parse(req.body);
      const alert = await storage.createAlert(input);
      res.status(201).json(alert);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.analytics.get.path, async (req, res) => {
    const data = await storage.getAnalytics();
    res.json(data);
  });

  // Call the seed database function
  await seedDatabase().catch(console.error);

  return httpServer;
}
