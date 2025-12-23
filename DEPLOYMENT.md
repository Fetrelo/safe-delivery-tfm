# Deployment Guide

## Prerequisites

1. Start Anvil (local Ethereum node):
```bash
anvil
```

This will start a local node on `http://127.0.0.1:8545` with chain ID `31337`.

## Deploy Contract

1. Set your private key (use one of the Anvil accounts):
```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

2. Deploy the contract:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

3. Copy the deployed contract address from the output.

4. Update the frontend configuration:
   - Create `.env.local` in the `frontend/` directory
   - Add: `NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed_address>`

## Start Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Testing

1. Make sure MetaMask is installed
2. Connect MetaMask to Anvil network:
   - Network Name: Anvil Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import one of the Anvil test accounts into MetaMask (private keys are shown when you start Anvil)

4. Connect your wallet in the frontend and start using the app!

