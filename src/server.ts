import app from './app.js';
import { config } from './config/index.js';

const startServer = async () => {
  try {
    // Start the server
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Billboard Management System API                              ║
║                                                                ║
║   Server running on: http://localhost:${config.port}                 ║
║   API Docs:          http://localhost:${config.port}/api/docs        ║
║   Environment:       ${config.nodeEnv.padEnd(40)}║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
