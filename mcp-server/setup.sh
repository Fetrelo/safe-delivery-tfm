#!/bin/bash

# SafeDelivery MCP Server Setup Script

set -e

echo "🚀 Setting up SafeDelivery MCP Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if contract ABI exists
ABI_PATH="../frontend/lib/contract-abi.json"
if [ ! -f "$ABI_PATH" ]; then
    echo "⚠️  Warning: Contract ABI not found at $ABI_PATH"
    echo "   Make sure to compile the contract first: forge build"
    echo "   Then copy the ABI if needed"
else
    echo "✅ Contract ABI found"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure Anvil is running: anvil"
echo "2. Deploy your contract and note the address"
echo "3. Configure Cursor/VS Code with the MCP server (see MCP_SETUP.md)"
echo "4. Set CONTRACT_ADDRESS environment variable or pass it in requests"
echo ""
echo "Example configuration:"
echo '{'
echo '  "mcpServers": {'
echo '    "safe-delivery": {'
echo '      "command": "node",'
echo "      "args": ["$(pwd)/dist/index.js"],"
echo '      "env": {'
echo '        "ANVIL_RPC_URL": "http://localhost:8545",'
echo '        "CONTRACT_ADDRESS": "YOUR_CONTRACT_ADDRESS"'
echo '      }'
echo '    }'
echo '  }'
echo '}'

