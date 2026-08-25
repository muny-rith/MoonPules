// Quick test: manually trigger the sync job to verify the new metrics work
require('dotenv').config();
const { syncPostStatus } = require('./src/jobs/syncPostStatus.job');

syncPostStatus().then(() => {
  console.log('\n✅ Sync job completed successfully with new metrics!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Sync job failed:', err);
  process.exit(1);
});
