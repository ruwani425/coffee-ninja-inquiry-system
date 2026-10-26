import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connection verified.');

    app.listen(PORT, () => {
      console.log(`🚀 Coffee Ninja API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
