# Safe Delivery - TFM

## Description

Safe Delivery is a decentralized logistics traceability platform built on the Ethereum blockchain. The platform enables end-to-end tracking of shipments through a transparent, immutable, and secure system that records every checkpoint, incident, and status change directly on-chain.

The system implements a comprehensive supply chain management solution where multiple actors (Senders, Carriers, Hubs, Recipients, Inspectors, and Sensors) can interact with shipments according to their roles. Each shipment's lifecycle is tracked through checkpoints that include geolocation data, temperature monitoring (for cold chain shipments), and automatic incident detection for delays, damages, and temperature violations.

The platform features an admin-controlled actor registration system, role-based access control, automatic incident detection, and a modern React frontend with interactive maps for visualizing shipment routes. All data is stored on-chain, ensuring transparency and immutability of the logistics records.

## Problem that it solves

Traditional logistics and supply chain management systems face several critical challenges:

1. **Lack of Transparency**: Stakeholders often cannot verify the authenticity of shipment records, leading to disputes and trust issues.

2. **Data Tampering**: Centralized systems are vulnerable to data manipulation, making it difficult to prove the integrity of shipment history.

3. **Cold Chain Compliance**: Temperature-sensitive shipments require continuous monitoring, but current systems often lack automated compliance checking and incident reporting.

4. **Multi-party Coordination**: Supply chains involve multiple independent parties (senders, carriers, hubs, recipients) who need to coordinate without a central authority, making it difficult to maintain a single source of truth.

5. **Incident Tracking**: Delays, damages, and temperature violations are often reported manually and can be disputed or lost, making accountability difficult.

Safe Delivery addresses these issues by leveraging blockchain technology to create an immutable, transparent, and decentralized logistics tracking system. Every checkpoint, status change, and incident is recorded on-chain, making it impossible to alter historical data. The system automatically detects incidents (delays, temperature violations, lost shipments) and enforces role-based permissions, ensuring that only authorized actors can perform specific actions at each stage of the shipment lifecycle.

## Tech stack used

- **Blockchain**: Ethereum Sepolia Testnet / Local Anvil Network
- **Smart Contracts**: Solidity ^0.8.20
- **Frontend**: React 19.2.3, Next.js 16.1.1, TypeScript
- **Styling**: Tailwind CSS 4
- **Web3 Integration**: Ethers.js 6.16.0
- **Maps**: Leaflet 1.9.4, React-Leaflet 5.0.0
- **Notifications**: React Hot Toast 2.6.0
- **Development Tools**: Foundry (Forge, Cast, Anvil)
- **Testing**: Foundry Test Framework
- **AI/Herramientas**: Claude 4.5 Sonnet (Thinking), Cursor IDE

## System architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  MetaMask    │  │   Leaflet     │      │
│  │  (Next.js)   │  │  Integration │  │     Maps      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         API Routes (Auto-checkpoint Service)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain Layer                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           SafeDelivery Smart Contract                  │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │ │
│  │  │  Actors    │  │ Shipments  │  │ Checkpoints│       │ │
│  │  │ Management │  │ Management │  │ & Incidents │       │ │
│  │  └────────────┘  └────────────┘  └────────────┘       │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Ethereum Network (Sepolia/Anvil)                │
└─────────────────────────────────────────────────────────────┘
```

### Key Components:

1. **Smart Contract (SafeDelivery.sol)**: Core on-chain logic for actor management, shipment lifecycle, checkpoint recording, and incident detection.

2. **Frontend Application**: React-based UI with role-based views, interactive maps, and real-time shipment tracking.

3. **Auto-checkpoint Service**: Backend API route that automatically records checkpoints every 10 minutes for shipments in transit.

4. **MetaMask Integration**: Wallet connection for transaction signing and account management.

## Installation and Configuration

### Requirements

- **Node.js** v18 or higher
- **npm**
- **MetaMask** browser extension installed
- **Foundry** (Forge, Cast, Anvil) - [Installation Guide](https://book.getfoundry.sh/getting-started/installation)
- **Alchemy account** (for Sepolia testnet RPC) or use public RPC endpoints

### Dependency Installation

#### Frontend dependencies installation

```bash
cd frontend
npm install
```

#### Smart Contracts compilation

```bash
# From project root
forge build
```

### Configuration

1. **Copy environment variables**:

   For contract deployment, create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   PRIVATE_KEY=your_deployer_private_key
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

2. **Frontend configuration**:

   Create `frontend/.env.local`:
   ```bash
   cd frontend
   # Create .env.local file
   ```

   Add these variables:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x7803d73C572f1FEa22542f58cE827ef5236cf1cF
   NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org
   
   # Optional: For auto-checkpoint service
   RPC_URL=https://rpc.sepolia.org
   SENSOR_PRIVATE_KEY=0xYOUR_SENSOR_PRIVATE_KEY
   SENSOR_ADDRESS=0xYOUR_SENSOR_ADDRESS
   ```

   See `.env.example` in the project root for detailed variable descriptions.

3. **Deploy smart contract to testnet**:

   ```bash
   # Deploy to Sepolia
   forge script script/Deploy.s.sol:DeployScript --rpc-url sepolia --broadcast --verify
   ```

   See [DEPLOY_SEPOLIA_STEPS.md](./DEPLOY_SEPOLIA_STEPS.md) for detailed deployment instructions.

### Execution

#### Frontend

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

#### Local Development (Anvil)

For local development:

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy to local network
export PRIVATE_KEY=ANVIL_ACCOUNT_PK
forge script contracts/script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast

# Terminal 3: Start frontend (update .env.local with local contract address)
cd frontend
npm run dev
```

## Deployed smart contracts

- **Net: Ethereum Sepolia Testnet
- **Contrato Contract**: [`0x7803d73C572f1FEa22542f58cE827ef5236cf1cF`](https://sepolia.etherscan.io/address/0x7803d73C572f1FEa22542f58cE827ef5236cf1cF#code)
- **Explorer**: [Etherscan Sepolia](https://sepolia.etherscan.io/address/0x7803d73C572f1FEa22542f58cE827ef5236cf1cF#code)

## Use cases

1. **Actor Registration**
   - Actors (Sender, Carrier, Hub, Recipient, Inspector, Sensor) register on the platform
   - Admin reviews and approves/rejects registration requests
   - Only approved actors can interact with shipments

2. **Actor Approval / Denial**
   - Admin panel with three tabs: Pending, Approved, Rejected
   - Admin can approve or reject actor registrations
   - Previously rejected actors can be re-approved

3. **Shipment Creation**
   - Senders create shipments with product details, origin, destination
   - Configure cold chain requirements (temperature range)
   - Set estimated delivery time (in hours)
   - Recipient address must be a registered actor

4. **Shipment Lifecycle**
   - **Created**: Shipment created by Sender
   - **InTransit**: Carrier picks up shipment
   - **AtHub**: Hub receives shipment
   - **OutForDelivery**: Carrier picks up from hub for final delivery
   - **Delivered**: Recipient confirms delivery
   - **Cancelled**: Automatically set if shipment is lost

5. **Checkpoint Recording**
   - Actors record checkpoints with location (GPS coordinates)
   - Different checkpoint types: Pickup, Hub, Transit, Delivery, Report
   - Automatic status transitions based on checkpoint type
   - Temperature monitoring for cold chain shipments
   - Interactive map for selecting checkpoint location

6. **Incident Management**
   - Automatic detection of delays (beyond estimated delivery)
   - Automatic detection of lost shipments (1+ hour delay)
   - Temperature violation detection
   - Damage reporting during checkpoints
   - All incidents are permanently recorded on-chain

7. **Auto-checkpoint Service**
   - Automatic checkpoint recording every 10 minutes
   - For shipments in "InTransit" or "OutForDelivery" status
   - Uses Sensor actor role with private key authentication
   - Simulates the use case of an IoT device

8. **Role-based Access Control**
   - **Sender**: Create shipments, view own shipments, record Report checkpoints
   - **Carrier**: View Created/InTransit/AtHub/OutForDelivery shipments, record Pickup/Transit checkpoints
   - **Hub**: View InTransit/AtHub shipments, record Hub checkpoints
   - **Recipient**: View own shipments, confirm delivery, record Delivery checkpoints
   - **Inspector**: Read-only access to all shipments
   - **Admin**: Approve/reject actors, view all data (cannot modify shipments)
   - **Sensor**: Automatic checkpoint recording via backend service

## Screenshots

[See folder `/screenshots`]

*Note: Add screenshots of the main features: Dashboard, Actor Registration, Shipment Creation, Shipment Details with Map, Admin Panel, etc.*

## Technical Diagrams

[See diagram documentation](docs/diagrams.md)

*Note: Create Mermaid diagrams or architecture diagrams in the docs folder*

## Video Demonstration

🎥 [Ver video](https://www.loom.com/share/...)

*Note: Add your video demonstration link here*

## Implemented Innovations

Based on the initial contract definition, the following enhancements and additional features were implemented:

### Enhanced Features:

1. **Admin-controlled Actor Registration System**
   - Actors must be approved by admin before they can interact with the system
   - Three-tier approval status: Pending, Approved, Rejected
   - Admin can re-approve previously rejected actors

2. **Automatic Incident Detection**
   - **Delay Detection**: Automatically detects when shipment exceeds estimated delivery time
   - **Lost Shipment Detection**: Automatically marks shipment as lost if delay exceeds 1 hour and cancels the shipment
   - **Temperature Violation**: Automatic detection when temperature falls outside specified range during checkpoints
   - **Damage Reporting**: Integrated into checkpoint recording with boolean flag

3. **Geolocation Tracking**
   - GPS coordinates (latitude/longitude) stored for every checkpoint
   - Interactive map interface for selecting checkpoint locations
   - Route visualization showing all checkpoints on a map
   - Default map location based on last checkpoint coordinates

4. **Cold Chain Management**
   - Configurable temperature range per shipment
   - Automatic temperature validation during checkpoints
   - Temperature violations automatically trigger incidents

5. **Flexible Checkpoint System**
   - Multiple checkpoint types: Pickup, Hub, Transit, Delivery, Report
   - Role-based checkpoint type restrictions
   - "Report" type allows actors to record checkpoints without status changes
   - Automatic status transitions based on checkpoint type and shipment state

6. **Auto-checkpoint Service**
   - Backend service that automatically records checkpoints every 10 minutes
   - Uses dedicated Sensor actor role
   - Only processes shipments in "InTransit" or "OutForDelivery" status
   - Prevents duplicate checkpoints within 10-minute window

7. **Role-based Shipment Visibility**
   - Actors only see shipments relevant to their role and status
   - Carriers see: Created, InTransit, AtHub, OutForDelivery
   - Hubs see: InTransit, AtHub
   - Senders/Recipients see all their shipments
   - Admin/Inspector see all shipments (read-only for Inspector)

8. **Status Transition Rules**
   - Enforced status flow: Created → InTransit → AtHub → OutForDelivery → Delivered
   - Exception: OutForDelivery can return to AtHub if delivery fails
   - Automatic status updates based on checkpoint types
   - Status cannot be manually changed by admin (integrity enforcement)

9. **Dashboard Statistics**
   - Overview dashboard for Admin and Inspector roles
   - Statistics: Total, Active, Completed, Cancelled shipments
   - Status breakdown visualization

10. **Modern UI/UX**
    - Tailwind CSS styling with custom color scheme (White primary, Indigo Blue secondary)
    - Side menu navigation (15-20% width)
    - Toast notifications (replacing browser alerts)
    - Responsive design
    - Interactive maps with Leaflet

11. **Actor Involvement Tracking**
    - Automatic addition of actors to shipment's involved actors list when they record checkpoints
    - Allows actors to see shipments they've interacted with

12. **Inspector Role**
    - Read-only access to all shipments
    - Cannot modify or interact with shipments
    - Can view complete shipment history and statistics

### Additional Functions Beyond Initial Definition:

- `isAdmin(address)`: Check if an address is the contract admin
- `setActorApprovalStatus()`: Admin function to approve/reject actors
- `isValidActorForCheckpointType()`: Validates actor role for specific checkpoint types
- `_checkDelayAndLost()`: Internal function for automatic incident detection
- `_addActorToShipment()`: Helper to track actor involvement
- `isValidStatusTransition()`: Validates status change rules
- `getAllShipments()`: Frontend helper to retrieve all shipments
- `getAllActors()`: Frontend helper to retrieve all actors via events

## AI Tools usage

- **Claude 4.5 Sonnet (Thinking)**: Used for smart contract development, frontend implementation, debugging, and architectural decisions throughout the project.

- **Cursor IDE**: Primary development environment with AI-powered code completion, refactoring suggestions, and intelligent code navigation.

## Author

- **Nombre:** Felipe de Jesús Pulido Mendoza
- **Email:** pulidom.felipe@gmail.com
- **LinkedIn:** [Felipe Pulido](https://www.linkedin.com/in/fpulidom/)

## License

MIT License

---

## Additional Resources

- [Deployment Guide](./DEPLOY_SEPOLIA_STEPS.md)
- [Auto-checkpoint Setup](./AUTO_CHECKPOINT_SETUP.md)
- [Quick Start Guide](./QUICK_START.md)
- [Querying Anvil Guide](./QUERY_ANVIL.md)
- [MCP Server Setup](./mcp-server/MCP_SETUP.md) - Query contract data directly through AI assistant


(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Admin)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Sender)
(2) 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Recipient 2)
(3) 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Carrier)
(4) 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (Hub)
(5) 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (Recipient)
(6) 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (Sensor)
(7) 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 (10000.000000000000000000 ETH)
(8) 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (10000.000000000000000000 ETH)
(9) 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 (Inspector)