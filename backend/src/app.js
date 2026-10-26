import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import inquiryRoutes from './routes/inquiries.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Coffee Ninja Customer Inquiry Management API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'ROUTE_NOT_FOUND',
    message: `The requested endpoint '${req.method} ${req.path}' does not exist.`
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
