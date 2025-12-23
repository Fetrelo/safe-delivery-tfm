# Quick Start Guide

## Contract Tests

The contract tests are in `test/SafeDelivery.t.sol` and all 28 tests are passing! ✅

To run the tests:
```bash
forge test
```

## Testing the Frontend

### Step 1: Start Anvil
```bash
anvil
```

Keep this running. You'll see output like:
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

### Step 2: Deploy Contract
In a new terminal:
```bash
cd ~/blockchain/ethereum-practice/safe-delivery

# Use the first account's private key
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the contract address from the output (it will say "SafeDelivery deployed at: 0x...")

### Step 3: Configure Frontend
```bash
cd frontend

# Create .env.local file
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=<paste_contract_address_here>" > .env.local

# Start the dev server
npm run dev
```

### Step 4: Configure MetaMask

1. Open MetaMask
2. Click the network dropdown → "Add Network" → "Add a network manually"
3. Enter:
   - Network Name: `Anvil Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
4. Save

5. Import a test account:
   - Click account icon → "Import Account"
   - Paste one of the private keys from Anvil (e.g., `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
   - This account will have 10000 ETH for testing

### Step 5: Test the Frontend

1. Open http://localhost:3000
2. Click "Connect MetaMask"
3. Select the Anvil Local network if prompted
4. Approve the connection

You should now see the dashboard! 🎉

## Current Features

✅ MetaMask connection/disconnection
✅ Side menu navigation
✅ Dashboard (shows shipments based on user role)
✅ Contract integration ready

## Next Steps

The following features are still to be implemented:
- Shipment creation form
- Shipment details page
- Checkpoint recording modal
- Admin panel
- Leaflet map integration
- Auto-checkpoint service

