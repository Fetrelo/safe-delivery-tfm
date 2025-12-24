# Auto-Checkpoint Service Setup Guide

This guide will help you set up the auto-checkpoint service that automatically records checkpoints for shipments in "InTransit" or "OutForDelivery" status every 10 minutes.

## Prerequisites

1. **Anvil running** on `http://127.0.0.1:8545`
2. **Contract deployed** (address: `0x5fbdb2315678afecb367f032d93f642f64180aa3`)
3. **Next.js frontend running** on `http://localhost:3000`

## Step 1: Create a Sensor Actor Account

You need to create a Sensor actor that will be used by the auto-checkpoint service.

### Option A: Use an Anvil Account

1. Start Anvil (if not already running):
   ```bash
   cd ~/blockchain/ethereum-practice/safe-delivery
   anvil
   ```

2. Anvil will display a list of accounts with their private keys. Choose one (e.g., the second account):
   - **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

### Option B: Generate a New Account

You can also use MetaMask or any tool to generate a new account.

## Step 2: Register and Approve the Sensor Actor

1. **Import the account into MetaMask** (if using Option A, use the private key from Anvil)

2. **Register as Sensor**:
   - Go to the frontend: `http://localhost:3000`
   - Connect MetaMask with the Sensor account
   - Navigate to "Register account"
   - Fill in the form:
     - Name: "Auto Sensor"
     - Role: "Sensor"
     - Location: "Automated System"
   - Submit the registration

3. **Approve the Sensor** (as Admin):
   - Switch to your Admin account in MetaMask
   - Go to "Admin Panel"
   - Find the Sensor actor in the "Pending" tab
   - Click "Approve"

## Step 3: Set Up Environment Variables

Create or update `.env.local` in the `frontend` directory:

```bash
cd ~/blockchain/ethereum-practice/safe-delivery/frontend
```

Create `.env.local` with:

```env
# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5fbdb2315678afecb367f032d93f642f64180aa3

# RPC Configuration (Anvil default)
RPC_URL=http://127.0.0.1:8545

# Sensor Account (replace with your Sensor account details)
SENSOR_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
SENSOR_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**⚠️ IMPORTANT**: 
- Replace `SENSOR_PRIVATE_KEY` and `SENSOR_ADDRESS` with the actual values from your Sensor account
- Never commit `.env.local` to version control (it's already in `.gitignore`)

## Step 4: Fund the Sensor Account (if needed)

The Sensor account needs ETH to pay for gas when recording checkpoints. If using Anvil, accounts are pre-funded. If using a different network, ensure the account has sufficient ETH.

## Step 5: Test the Auto-Checkpoint Service

### Manual Test

1. Make sure your Next.js server is running:
   ```bash
   cd ~/blockchain/ethereum-practice/safe-delivery/frontend
   npm run dev
   ```

2. Test the endpoint manually:
   ```bash
   curl http://localhost:3000/api/auto-checkpoint
   ```

   You should see a response like:
   ```json
   {
     "success": true,
     "message": "Processed X shipments",
     "shipments": [1, 2, 3],
     "timestamp": "2024-01-01T12:00:00.000Z"
   }
   ```

### Create a Test Shipment

1. Create a shipment with status "InTransit" or "OutForDelivery"
2. Wait 10 minutes (or manually trigger the endpoint)
3. Check the shipment details - you should see new checkpoints recorded automatically

## Step 6: Set Up Automatic Execution

The service needs to be called every 10 minutes. Choose one of these options:

### Option 1: Manual Trigger (Development)
Just call the endpoint manually when needed:
```bash
curl http://localhost:3000/api/auto-checkpoint
```

### Option 2: System Cron Job (Linux/Mac)
Add to your crontab:
```bash
crontab -e
```

Add this line:
```
*/10 * * * * curl http://localhost:3000/api/auto-checkpoint
```

### Option 3: Node.js Cron Service
Create a separate service file (see `app/api/auto-checkpoint/cron.ts` for reference):

1. Install node-cron:
   ```bash
   cd ~/blockchain/ethereum-practice/safe-delivery/frontend
   npm install node-cron
   ```

2. Create a cron service file and run it separately

### Option 4: Vercel Cron (Production)
If deploying to Vercel, add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/auto-checkpoint",
    "schedule": "*/10 * * * *"
  }]
}
```

## Troubleshooting

### Error: "Missing required environment variables"
- Check that `.env.local` exists and has all required variables
- Restart the Next.js server after creating/updating `.env.local`

### Error: "Sensor actor not registered"
- Make sure you registered the Sensor account in the frontend
- Verify the `SENSOR_ADDRESS` in `.env.local` matches the registered address

### Error: "Sensor actor not approved"
- Go to Admin Panel and approve the Sensor actor
- Verify the actor's `approvalStatus` is `Approved` (status = 1)

### No checkpoints being created
- Ensure there are shipments with status "InTransit" (1) or "OutForDelivery" (3)
- Check that at least 10 minutes (600 seconds) have passed since the last checkpoint
- Verify the Sensor account has sufficient ETH for gas

### Service not running automatically
- Check that your cron job is set up correctly
- Verify the Next.js server is running
- Check cron logs: `grep CRON /var/log/syslog` (Linux) or check system logs

## How It Works

1. The service scans all shipment IDs (up to 1000 by default)
2. For each shipment with status "InTransit" or "OutForDelivery":
   - Checks if 10 minutes have passed since the last checkpoint
   - Records a new "Report" checkpoint with the same location as the last checkpoint
   - Does not change the shipment status (uses "Report" type)
3. Returns a summary of processed shipments

## Notes

- The service uses the Sensor role to record checkpoints
- Checkpoints are recorded with type "Report" (doesn't change shipment status)
- The location and coordinates are copied from the last checkpoint
- Temperature is set to 0 (not applicable for auto-checkpoints)
- The service only processes shipments that have at least one existing checkpoint

