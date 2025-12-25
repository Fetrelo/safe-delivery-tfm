# SafeDelivery MCP Server

Model Context Protocol (MCP) server for querying SafeDelivery smart contract data from Anvil local network.

## Features

This MCP server provides tools to:
- Query contract state (admin, shipment IDs, etc.)
- Get shipment, checkpoint, actor, and incident details
- Fetch transaction information and receipts
- Query account balances and block information
- Call any read-only contract function
- Get contract events

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

### Environment Variables

- `ANVIL_RPC_URL`: RPC URL for Anvil (default: `http://localhost:8545`)
- `CONTRACT_ADDRESS`: Default contract address (optional, can be passed per request)

### Cursor/VS Code Configuration

Add this to your Cursor/VS Code settings (`.cursor/mcp.json` or similar):

```json
{
  "mcpServers": {
    "safe-delivery": {
      "command": "node",
      "args": ["/absolute/path/to/safe-delivery/mcp-server/dist/index.js"],
      "env": {
        "ANVIL_RPC_URL": "http://localhost:8545",
        "CONTRACT_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      }
    }
  }
}
```

Or if using the development version with tsx:

```json
{
  "mcpServers": {
    "safe-delivery": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/safe-delivery/mcp-server/src/index.ts"],
      "env": {
        "ANVIL_RPC_URL": "http://localhost:8545",
        "CONTRACT_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      }
    }
  }
}
```

## Available Tools

### `get_contract_info`
Get basic contract information (admin, next IDs).

**Parameters:**
- `contractAddress` (required): Contract address
- `rpcUrl` (optional): RPC URL

### `get_shipment`
Get shipment details by ID.

**Parameters:**
- `contractAddress` (required): Contract address
- `shipmentId` (required): Shipment ID
- `rpcUrl` (optional): RPC URL

### `get_all_shipments`
Get all shipments from the contract.

**Parameters:**
- `contractAddress` (required): Contract address
- `limit` (optional): Maximum number of shipments (default: 50)
- `rpcUrl` (optional): RPC URL

### `get_checkpoint`
Get checkpoint details by ID.

**Parameters:**
- `contractAddress` (required): Contract address
- `checkpointId` (required): Checkpoint ID
- `rpcUrl` (optional): RPC URL

### `get_actor`
Get actor information by address.

**Parameters:**
- `contractAddress` (required): Contract address
- `actorAddress` (required): Actor address
- `rpcUrl` (optional): RPC URL

### `get_incident`
Get incident details by ID.

**Parameters:**
- `contractAddress` (required): Contract address
- `incidentId` (required): Incident ID
- `rpcUrl` (optional): RPC URL

### `get_transaction`
Get transaction details by hash.

**Parameters:**
- `txHash` (required): Transaction hash
- `rpcUrl` (optional): RPC URL

### `get_transaction_receipt`
Get transaction receipt by hash.

**Parameters:**
- `txHash` (required): Transaction hash
- `rpcUrl` (optional): RPC URL

### `get_balance`
Get account balance.

**Parameters:**
- `address` (required): Account address
- `rpcUrl` (optional): RPC URL

### `get_block_info`
Get block information.

**Parameters:**
- `blockNumber` (required): Block number or "latest"
- `rpcUrl` (optional): RPC URL

### `query_contract_function`
Call any read-only contract function.

**Parameters:**
- `contractAddress` (required): Contract address
- `functionName` (required): Function name
- `args` (optional): Function arguments array
- `rpcUrl` (optional): RPC URL

### `get_contract_events`
Get contract events filtered by event name.

**Parameters:**
- `contractAddress` (required): Contract address
- `eventName` (required): Event name (e.g., "ShipmentCreated")
- `fromBlock` (optional): From block number (default: 0)
- `toBlock` (optional): To block number (default: "latest")
- `rpcUrl` (optional): RPC URL

## Usage Examples

Once configured, you can ask the AI assistant:

- "Get contract info for address 0x..."
- "Show me shipment #1"
- "Get all shipments from the contract"
- "What's the balance of address 0x..."
- "Get transaction receipt for 0x..."
- "Show me all ShipmentCreated events"

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

## Troubleshooting

1. **"Could not load contract ABI"**: Make sure the contract has been compiled and `frontend/lib/contract-abi.json` exists.

2. **Connection errors**: Ensure Anvil is running on `http://localhost:8545`.

3. **Contract not found**: Verify the contract address is correct and the contract is deployed to Anvil.

4. **MCP server not found**: Check that the path in your MCP configuration is absolute and correct.

