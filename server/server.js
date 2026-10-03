require('dotenv').config(); // Config loaded
const app = require('./app');
const connectDB = require('./config/db');
const { startExpirationCron } = require('./services/expirationService');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB().then(() => {
  // Start expiration cron for past-due donations
  const cronHandle = startExpirationCron(60000);

  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful Shutdown Handling (SIGINT, SIGTERM)
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new cron intervals
    if (cronHandle) {
      clearInterval(cronHandle);
    }

    // Stop accepting new HTTP requests and finish pending in-flight requests
    server.close(async () => {
      console.log('HTTP server closed. Draining database connections...');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close(false);
        console.log('MongoDB connection drained and closed cleanly.');
        process.exit(0);
      } catch (err) {
        console.error('Error during database disconnect:', err);
        process.exit(1);
      }
    });

    // Forced shutdown timeout if requests hang beyond 10s
    setTimeout(() => {
      console.error('Forced shutdown: Timed out waiting for connections to close.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
