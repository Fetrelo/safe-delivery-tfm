# MCP Server Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
npm run build
```

### 2. Get Your Contract Address

Deploy your contract to Anvil and note the contract address:

```bash
# In another terminal, start Anvil
anvil

# In this terminal, deploy
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script contracts/script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast
```

Copy the deployed contract address from the output.

### 3. Configure Cursor/VS Code

#### Option A: Using Cursor Settings (Recommended)

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add the server configuration

Or manually edit the settings file:

**For Cursor:**
- Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

**For VS Code with MCP Extension:**
- Check the extension's configuration location

#### Option B: Using Environment Variables

You can also set environment variables in your shell:

```bash
export ANVIL_RPC_URL=http://localhost:8545
export CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 4. Configuration Format

Here's the configuration format (adjust paths as needed):

```json
{
  "mcpServers": {
    "safe-delivery": {
      "command": "node",
      "args": [
        "/home/fetrelo/blockchain/ethereum-practice/safe-delivery/mcp-server/dist/index.js"
      ],
      "env": {
        "ANVIL_RPC_URL": "http://localhost:8545",
        "CONTRACT_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      }
    }
  }
}
```

**Important:** Use absolute paths for the command and args.

### 5. Development Mode (Optional)

For development with hot-reload, use tsx:

```json
{
  "mcpServers": {
    "safe-delivery": {
      "command": "npx",
      "args": [
        "tsx",
        "/home/fetrelo/blockchain/ethereum-practice/safe-delivery/mcp-server/src/index.ts"
      ],
      "env": {
        "ANVIL_RPC_URL": "http://localhost:8545",
        "CONTRACT_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      }
    }
  }
}
```

### 6. Verify Installation

1. Restart Cursor/VS Code
2. Make sure Anvil is running: `anvil`
3. Ask the AI: "Get contract info for address 0x..."

## Troubleshooting

### Server Not Starting

1. Check that Node.js is installed: `node --version`
2. Verify the path is absolute and correct
3. Check Cursor/VS Code console for errors

### Connection Errors

1. Ensure Anvil is running: `anvil`
2. Verify RPC URL: `curl http://localhost:8545` should return JSON
3. Check contract address is correct

### ABI Not Found

1. Make sure contract is compiled: `forge build`
2. Verify ABI exists: `ls frontend/lib/contract-abi.json`
3. If missing, copy from `out/SafeDelivery.sol/SafeDelivery.json`:
   ```bash
   cp out/SafeDelivery.sol/SafeDelivery.json frontend/lib/contract-abi.json
   ```

### Testing the Server Manually

You can test the server directly:

```bash
cd mcp-server
ANVIL_RPC_URL=http://localhost:8545 CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 node dist/index.js
```

The server communicates via stdio, so it won't produce visible output when run directly.

## Usage Examples

Once configured, you can ask:

- "What's the contract admin address?"
- "Show me shipment #1"
- "Get all shipments"
- "What's the balance of 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266?"
- "Get transaction receipt for 0x..."
- "Show me all ShipmentCreated events"
- "Get checkpoint #5"
- "What actor is at address 0x..."

