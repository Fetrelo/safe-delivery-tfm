# Querying On-Chain Data from Anvil Local Network

This guide shows multiple ways to gather on-chain information from your Anvil local network.

## Prerequisites

1. **Anvil must be running**:
   ```bash
   anvil
   ```
   Default RPC URL: `http://localhost:8545`
   Default Chain ID: `31337`

2. **Contract must be deployed** to Anvil. If not deployed yet:
   ```bash
   export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   forge script contracts/script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast
   ```

## Method 1: Using Cast (Foundry CLI)

Cast is the fastest way to query on-chain data directly from the command line.

### Basic Cast Commands

```bash
# Get account balance
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Get block number
cast block-number --rpc-url http://localhost:8545

# Get block information
cast block latest --rpc-url http://localhost:8545

# Get transaction receipt
cast tx 0x<tx_hash> --rpc-url http://localhost:8545

# Get storage slot value
cast storage <contract_address> <slot> --rpc-url http://localhost:8545
```

### Querying Contract Functions

```bash
# Read a public state variable
cast call <contract_address> "admin()" --rpc-url http://localhost:8545

# Read a mapping
cast call <contract_address> "actors(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Read a struct (shipment)
cast call <contract_address> "shipments(uint256)" 1 --rpc-url http://localhost:8545

# Get next shipment ID
cast call <contract_address> "nextShipmentId()" --rpc-url http://localhost:8545

# Check if address is admin
cast call <contract_address> "isAdmin(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545
```

### Example: Get Shipment Details

```bash
# Replace <contract_address> with your deployed contract address
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Get shipment #1
cast call $CONTRACT_ADDRESS "shipments(uint256)" 1 --rpc-url http://localhost:8545

# Get shipment status (returns enum as uint256)
cast call $CONTRACT_ADDRESS "shipmentStatus(uint256)" 1 --rpc-url http://localhost:8545
```

### Decoding Return Values

Cast automatically decodes simple types. For complex structs, you may need to decode manually:

```bash
# Get raw bytes and decode
cast call <contract_address> "shipments(uint256)" 1 --rpc-url http://localhost:8545 | cast --to-dec
```

## Method 2: Using Ethers.js with JsonRpcProvider

Create a Node.js script to query the contract programmatically.

### Example Script: `query-anvil.js`

```javascript
const { ethers } = require('ethers');
const CONTRACT_ABI = require('./frontend/lib/contract-abi.json');

// Anvil RPC URL
const RPC_URL = 'http://localhost:8545';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with your deployed address

async function queryAnvil() {
  // Create provider connected to Anvil
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Create contract instance (read-only, no signer needed)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  try {
    // Query public state variables
    console.log('Admin:', await contract.admin());
    console.log('Next Shipment ID:', await contract.nextShipmentId());
    console.log('Next Checkpoint ID:', await contract.nextCheckpointId());
    console.log('Next Incident ID:', await contract.nextIncidentId());
    
    // Query a shipment
    const shipmentId = 1;
    const shipment = await contract.shipments(shipmentId);
    console.log('\nShipment #1:', {
      id: shipment.id.toString(),
      sender: shipment.sender,
      recipient: shipment.recipient,
      product: shipment.product,
      status: shipment.status,
      dateCreated: new Date(Number(shipment.dateCreated) * 1000).toLocaleString(),
    });
    
    // Query an actor
    const actorAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const actor = await contract.actors(actorAddress);
    console.log('\nActor:', {
      address: actor.actorAddress,
      name: actor.name,
      role: actor.role,
      isActive: actor.isActive,
      approvalStatus: actor.approvalStatus,
    });
    
    // Query checkpoint
    const checkpointId = 1;
    const checkpoint = await contract.checkpoints(checkpointId);
    console.log('\nCheckpoint #1:', {
      id: checkpoint.id.toString(),
      shipmentId: checkpoint.shipmentId.toString(),
      actor: checkpoint.actor,
      location: checkpoint.location,
      checkpointType: checkpoint.checkpointType,
      timestamp: new Date(Number(checkpoint.timestamp) * 1000).toLocaleString(),
    });
    
    // Get all events (requires filtering)
    console.log('\nFetching events...');
    const filter = contract.filters.ShipmentCreated();
    const events = await contract.queryFilter(filter);
    console.log('ShipmentCreated events:', events.length);
    
  } catch (error) {
    console.error('Error querying contract:', error);
  }
}

queryAnvil();
```

### Run the Script

```bash
cd safe-delivery
node query-anvil.js
```

## Method 3: Using TypeScript/Node Script

Create a TypeScript script for type-safe queries.

### Example: `scripts/query-anvil.ts`

```typescript
import { ethers } from 'ethers';
import CONTRACT_ABI from '../frontend/lib/contract-abi.json';

const RPC_URL = 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  // Query multiple shipments
  const nextShipmentId = await contract.nextShipmentId();
  console.log(`Total shipments: ${nextShipmentId - 1n}`);
  
  for (let i = 1; i < Number(nextShipmentId); i++) {
    const shipment = await contract.shipments(i);
    console.log(`\nShipment #${i}:`);
    console.log(`  Sender: ${shipment.sender}`);
    console.log(`  Recipient: ${shipment.recipient}`);
    console.log(`  Product: ${shipment.product}`);
    console.log(`  Status: ${shipment.status}`);
  }
}

main().catch(console.error);
```

### Run with ts-node

```bash
npx ts-node scripts/query-anvil.ts
```

## Method 4: Direct JSON-RPC Calls

You can make direct HTTP requests to Anvil's JSON-RPC endpoint.

### Using curl

```bash
# Get account balance
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "latest"],
    "id": 1
  }'

# Call contract function
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "<contract_address>",
      "data": "0x8da5cb5b"  // admin() function selector
    }, "latest"],
    "id": 1
  }'
```

### Using .http file (REST Client Extension)

Create `query-anvil.http`:

```http
### Get Account Balance
POST http://localhost:8545
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_getBalance",
  "params": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "latest"],
  "id": 1
}

### Get Block Number
POST http://localhost:8545
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 2
}

### Call Contract Function: admin()
POST http://localhost:8545
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [{
    "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "data": "0x8da5cb5b"
  }, "latest"],
  "id": 3
}

### Get Transaction Receipt
POST http://localhost:8545
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_getTransactionReceipt",
  "params": ["0x<transaction_hash>"],
  "id": 4
}
```

## Method 5: Using Foundry Scripts

Create a Foundry script for complex queries.

### Example: `contracts/script/Query.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SafeDelivery} from "../SafeDelivery.sol";

contract QueryScript is Script {
    function run() external view {
        // Get contract address from environment or use default
        address contractAddress = vm.envOr("CONTRACT_ADDRESS", address(0x5FbDB2315678afecb367f032d93F642f64180aa3));
        
        SafeDelivery contract = SafeDelivery(contractAddress);
        
        // Query state
        console.log("Admin:", contract.admin());
        console.log("Next Shipment ID:", contract.nextShipmentId());
        
        // Query shipment
        uint256 shipmentId = 1;
        (uint256 id, address sender, address recipient, string memory product, , , , , , , , , ) = contract.shipments(shipmentId);
        console.log("Shipment #1:");
        console.log("  ID:", id);
        console.log("  Sender:", sender);
        console.log("  Recipient:", recipient);
        console.log("  Product:", product);
    }
}
```

### Run the Script

```bash
forge script contracts/script/Query.s.sol:QueryScript --rpc-url http://localhost:8545
```

## Method 6: Using Your Frontend Code

You can also query from your existing frontend by creating a read-only provider:

### Example: `frontend/lib/query-anvil.ts`

```typescript
import { ethers } from 'ethers';
import { CONTRACT_ABI } from './web3';

const RPC_URL = 'http://localhost:8545';

export async function queryContract(contractAddress: string) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
  
  // Read-only queries (no signer needed)
  const admin = await contract.admin();
  const nextShipmentId = await contract.nextShipmentId();
  
  return {
    admin,
    nextShipmentId: Number(nextShipmentId),
  };
}
```

## Function Selectors Reference

For direct JSON-RPC calls, you need function selectors. Common ones for SafeDelivery:

```bash
# Get function selector
cast sig "admin()"                    # 0x8da5cb5b
cast sig "nextShipmentId()"           # 0x...
cast sig "shipments(uint256)"         # 0x...
cast sig "actors(address)"            # 0x...
cast sig "checkpoints(uint256)"       # 0x...
cast sig "isAdmin(address)"           # 0x...
```

## Tips

1. **Anvil Accounts**: Anvil provides 10 pre-funded accounts. The first account (index 0) is the default admin:
   - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

2. **Chain ID**: Anvil uses chain ID `31337` by default.

3. **Gas**: Anvil has no gas limits, so you don't need to worry about gas estimation for queries.

4. **Events**: Use `cast logs` or ethers.js `queryFilter` to retrieve events:
   ```bash
   cast logs --from-block 0 --to-block latest <contract_address> --rpc-url http://localhost:8545
   ```

5. **Storage Slots**: You can inspect storage directly:
   ```bash
   # Get storage at slot 0
   cast storage <contract_address> 0 --rpc-url http://localhost:8545
   ```

## Quick Reference Commands

```bash
# Set contract address as variable
export CONTRACT=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Get admin
cast call $CONTRACT "admin()" --rpc-url http://localhost:8545

# Get shipment count
cast call $CONTRACT "nextShipmentId()" --rpc-url http://localhost:8545

# Get shipment #1
cast call $CONTRACT "shipments(uint256)" 1 --rpc-url http://localhost:8545

# Get actor info
cast call $CONTRACT "actors(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Get checkpoint #1
cast call $CONTRACT "checkpoints(uint256)" 1 --rpc-url http://localhost:8545
```

