# Safe Delivery Frontend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Set environment variables in `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed_contract_address>
RPC_URL=http://127.0.0.1:8545
SENSOR_PRIVATE_KEY=<sensor_private_key>
SENSOR_ADDRESS=<sensor_address>
```

4. Start development server:
```bash
npm run dev
```

## Features

- ✅ MetaMask wallet connection
- ✅ Shipment creation
- ✅ Shipment tracking with map visualization
- ✅ Checkpoint recording with geolocation
- ✅ Actor registration
- ✅ Admin panel for actor approval
- ✅ Auto-checkpoint API route

## Auto-Checkpoint Service

The auto-checkpoint service runs via API route at `/api/auto-checkpoint`. To set up automatic execution:

### Option 1: Manual Trigger
Call the API endpoint manually:
```bash
curl http://localhost:3000/api/auto-checkpoint
```

### Option 2: Cron Job
Set up a system cron job to call the endpoint every 10 minutes:
```bash
*/10 * * * * curl http://localhost:3000/api/auto-checkpoint
```

### Option 3: Node.js Service
Create a separate Node.js service using `node-cron` (see `app/api/auto-checkpoint/cron.ts` for example).

## Notes

- The admin panel currently shows a placeholder. In production, you'd query the `ActorRegistered` event to get all registered actors.
- The auto-checkpoint service scans shipment IDs up to 1000. Adjust based on your needs or implement event-based tracking.
