# Step-by-Step Sepolia Deployment Checklist

Follow these steps in order:

## ✅ Step 1: Get Sepolia ETH (Testnet Tokens)

You need Sepolia ETH to pay for gas. Choose one faucet:

1. **Alchemy Faucet** (Recommended): https://sepoliafaucet.com/
   - Sign in with Alchemy account
   - Enter your wallet address
   - Request Sepolia ETH

2. **Infura Faucet**: https://www.infura.io/faucet/sepolia
   - Enter your wallet address
   - Request Sepolia ETH

3. **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia
   - Enter your wallet address
   - Request Sepolia ETH

**Check your balance**: You should have at least 0.01 Sepolia ETH (usually costs much less, but good to have buffer)

---

## ✅ Step 2: Get Sepolia RPC URL

You need an RPC endpoint. Choose one:

### Option A: Alchemy (Recommended - Most Reliable)
1. Go to: https://www.alchemy.com/
2. Sign up (free)
3. Create new app:
   - Network: Ethereum
   - Chain: Sepolia
4. Copy the HTTPS URL (looks like: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`)

### Option B: Infura
1. Go to: https://www.infura.io/
2. Sign up (free)
3. Create new project
4. Select "Sepolia" network
5. Copy the HTTPS URL (looks like: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`)

### Option C: Public RPC (Less Reliable)
- URL: `https://rpc.sepolia.org`
- ⚠️ May be rate-limited, use only for testing

---

## ✅ Step 3: Get Your Private Key

**⚠️ SECURITY WARNING**: 
- Use a dedicated test account, NOT your main wallet
- Never share your private key
- This is for testnet only

**How to get your private key**:
1. Open MetaMask
2. Click the account icon (top right)
3. Click "Account details"
4. Click "Show private key"
5. Enter your password
6. Copy the private key (starts with `0x`)

**OR** if you're using a test account from Anvil, use one of those private keys.

---

## ✅ Step 4: Create .env File

Create `.env` in the project root:

```bash
cd ~/blockchain/ethereum-practice/safe-delivery
nano .env
```

Add these lines (replace with your actual values):
```env
# Your private key (the account with Sepolia ETH)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Etherscan API Key (optional, for contract verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

**Save the file** (Ctrl+X, then Y, then Enter in nano)

---

## ✅ Step 5: Verify Your Setup

Test your RPC connection:

```bash
cast block-number --rpc-url sepolia
```

Should return a block number (e.g., `12345678`)

Check your account balance:

```bash
cast balance YOUR_ADDRESS --rpc-url sepolia
```

Replace `YOUR_ADDRESS` with your wallet address (the one that has Sepolia ETH).

---

## ✅ Step 6: Deploy the Contract

Run the deployment command:

```bash
cd ~/blockchain/ethereum-practice/safe-delivery
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  -vvvv
```

**What to expect**:
- It will compile the contract
- It will simulate the deployment
- It will ask you to confirm (type `y` and press Enter)
- It will broadcast the transaction
- You'll see: `SafeDelivery deployed at: 0x...`

**Save the deployed address!** You'll need it for the frontend.

---

## ✅ Step 7: Verify on Etherscan (Optional)

If you want to verify the contract source code on Etherscan:

1. Get Etherscan API key: https://etherscan.io/apis
2. Add to `.env`: `ETHERSCAN_API_KEY=your_key_here`
3. Redeploy with verification:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

---

## ✅ Step 8: Update Frontend Configuration

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Your deployed contract address from Step 6
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SENSOR_PRIVATE_KEY=...
SENSOR_ADDRESS=...
```

**Restart your Next.js server** after updating `.env.local`

---

## ✅ Step 9: Configure MetaMask for Sepolia

Add Sepolia network to MetaMask:

1. Open MetaMask
2. Click network dropdown
3. Click "Add network" → "Add a network manually"
4. Enter:
   - Network Name: `Sepolia`
   - RPC URL: Your Sepolia RPC URL
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`
5. Click "Save"

---

## ✅ Step 10: Test the Deployment

1. Connect MetaMask to Sepolia network
2. Open your frontend: `http://localhost:3000`
3. Connect your wallet
4. Try registering an actor
5. Create a test shipment

---

## Troubleshooting

### "insufficient funds"
- Get more Sepolia ETH from a faucet
- Check balance: `cast balance YOUR_ADDRESS --rpc-url sepolia`

### "nonce too low"
- Wait 30 seconds and try again
- Or check your nonce: `cast nonce YOUR_ADDRESS --rpc-url sepolia`

### "RPC rate limit"
- Use Alchemy or Infura (not public RPC)
- Wait a few minutes and try again

### Contract not found in frontend
- Make sure `NEXT_PUBLIC_CONTRACT_ADDRESS` is correct
- Restart Next.js server
- Clear browser cache

---

## Next Steps After Deployment

1. ✅ Register actors on Sepolia
2. ✅ Create test shipments
3. ✅ Test checkpoint recording
4. ✅ Test admin panel
5. ✅ Set up auto-checkpoint service with Sepolia RPC

