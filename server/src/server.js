const app = require('./app');
const env = require('./config/env');
const syncPostStatusJob = require('./jobs/syncPostStatus.job');
const publishScheduler = require('./modules/postTracker/publishScheduler.service');

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Safety] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server Safety] Uncaught Exception:', err?.message || err);
});

const startServer = () => {
  app.listen(env.PORT, () => {
    console.log(`[Server] Express running on port ${env.PORT}`);
    
    // Start Cron Jobs
    syncPostStatusJob.startJob();

    // Initialize Precision Publishing Scheduler
    publishScheduler.initScheduler();
  });
};

startServer();

