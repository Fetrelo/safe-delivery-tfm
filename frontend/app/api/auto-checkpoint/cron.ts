// This file is for documentation purposes
// To set up automatic execution, you can:

// Option 1: Use Vercel Cron (if deploying to Vercel)
// Add to vercel.json:
/*
{
  "crons": [{
    "path": "/api/auto-checkpoint",
    "schedule": "*/10 * * * *"
  }]
}
*/

// Option 2: Use a Node.js cron job
// Install: npm install node-cron
// Create a separate service file:
/*
import cron from 'node-cron';
import fetch from 'node-fetch';

cron.schedule('*/10 * * * *', async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auto-checkpoint');
    const data = await response.json();
    console.log('Auto-checkpoint executed:', data);
  } catch (error) {
    console.error('Auto-checkpoint error:', error);
  }
});
*/

// Option 3: Use a system cron job
// Add to crontab: */10 * * * * curl http://localhost:3000/api/auto-checkpoint

