const app = require('./app');
const env = require('./config/env');
const syncPostStatusJob = require('./jobs/syncPostStatus.job');

const startServer = () => {
  app.listen(env.PORT, () => {
    console.log(`[Server] Express running on port ${env.PORT}`);
    
    // Start Cron Jobs
    syncPostStatusJob.startJob();
  });
};

startServer();
