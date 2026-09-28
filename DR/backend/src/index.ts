import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ensureDirectoryExists, initializeSampleImages } from './utils/imageGenerator';
import { seedDatabase } from './db/seedData';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists and sample fundus/GradCAM visual assets are initialized
ensureDirectoryExists(config.storagePath);
initializeSampleImages(config.storagePath);

// Serve static images / uploads
app.use('/uploads', express.static(config.storagePath));

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Seed database with realistic rural screening data on startup
seedDatabase(false);

const server = app.listen(config.port, () => {
  console.log(`
  =============================================================
  🩺 NetraAI — Explainable DR Screening Backend API
  -------------------------------------------------------------
  🌐 Status:        Online & Ready
  🚀 Port:          ${config.port}
  📦 Database:      PostgreSQL / DataStore Engine Active
  🧠 AI Pipeline:   ${config.aiServiceType.toUpperCase()} Engine (${config.aiServiceType === 'matlab' ? config.matlabAiServiceUrl : 'Model-Agnostic Heuristic Mock'})
  📊 Simulink Sim:  ${config.simulationServiceType.toUpperCase()} SimEvents Engine
  📁 File Storage:  ${config.storagePath}
  =============================================================
  `);
});

export default app;
