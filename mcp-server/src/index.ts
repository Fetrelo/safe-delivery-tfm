#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_RPC_URL = process.env.ANVIL_RPC_URL || 'http://localhost:8545';
const DEFAULT_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';

// Load contract ABI
const ABI_PATH = path.join(__dirname, '../../frontend/lib/contract-abi.json');
let CONTRACT_ABI: any[] = [];

try {
  const abiContent = fs.readFileSync(ABI_PATH, 'utf-8');
  CONTRACT_ABI = JSON.parse(abiContent);
} catch (error) {
  console.error('Warning: Could not load contract ABI:', error);
}

// Helper functions
function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
}

function getContract(contractAddress: string): ethers.Contract {
  const provider = getProvider();
  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
}

function formatShipmentStatus(status: bigint): string {
  const statuses = ['Created', 'InTransit', 'AtHub', 'OutForDelivery', 'Delivered', 'Returned', 'Cancelled'];
  return statuses[Number(status)] || `Unknown(${status})`;
}

function formatActorRole(role: bigint): string {
  const roles = ['None', 'Sender', 'Carrier', 'Hub', 'Recipient', 'Inspector', 'Sensor'];
  return roles[Number(role)] || `Unknown(${role})`;
}

function formatApprovalStatus(status: bigint): string {
  const statuses = ['Pending', 'Approved', 'Rejected'];
  return statuses[Number(status)] || `Unknown(${status})`;
}

// Create MCP server
const server = new Server(
  {
    name: 'safe-delivery-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_contract_info',
        description: 'Get basic contract information (admin, next IDs)',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address to query',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress'],
        },
      },
      {
        name: 'get_shipment',
        description: 'Get shipment details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            shipmentId: {
              type: 'number',
              description: 'Shipment ID to query',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'shipmentId'],
        },
      },
      {
        name: 'get_all_shipments',
        description: 'Get all shipments from the contract',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of shipments to return (default: 50)',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress'],
        },
      },
      {
        name: 'get_checkpoint',
        description: 'Get checkpoint details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            checkpointId: {
              type: 'number',
              description: 'Checkpoint ID to query',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'checkpointId'],
        },
      },
      {
        name: 'get_actor',
        description: 'Get actor information by address',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            actorAddress: {
              type: 'string',
              description: 'Actor address to query',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'actorAddress'],
        },
      },
      {
        name: 'get_incident',
        description: 'Get incident details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            incidentId: {
              type: 'number',
              description: 'Incident ID to query',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'incidentId'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get transaction details by hash',
        inputSchema: {
          type: 'object',
          properties: {
            txHash: {
              type: 'string',
              description: 'Transaction hash',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['txHash'],
        },
      },
      {
        name: 'get_transaction_receipt',
        description: 'Get transaction receipt by hash',
        inputSchema: {
          type: 'object',
          properties: {
            txHash: {
              type: 'string',
              description: 'Transaction hash',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['txHash'],
        },
      },
      {
        name: 'get_balance',
        description: 'Get account balance',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Account address',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'get_block_info',
        description: 'Get block information',
        inputSchema: {
          type: 'object',
          properties: {
            blockNumber: {
              type: ['number', 'string'],
              description: 'Block number or "latest"',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['blockNumber'],
        },
      },
      {
        name: 'query_contract_function',
        description: 'Call any read-only contract function',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            functionName: {
              type: 'string',
              description: 'Function name to call',
            },
            args: {
              type: 'array',
              description: 'Function arguments',
              items: {},
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'functionName'],
        },
      },
      {
        name: 'get_contract_events',
        description: 'Get contract events filtered by event name and optional parameters',
        inputSchema: {
          type: 'object',
          properties: {
            contractAddress: {
              type: 'string',
              description: 'Contract address',
            },
            eventName: {
              type: 'string',
              description: 'Event name (e.g., ShipmentCreated, CheckpointRecorded)',
            },
            fromBlock: {
              type: ['number', 'string'],
              description: 'From block number (default: 0)',
            },
            toBlock: {
              type: ['number', 'string'],
              description: 'To block number (default: "latest")',
            },
            rpcUrl: {
              type: 'string',
              description: 'RPC URL (defaults to http://localhost:8545)',
            },
          },
          required: ['contractAddress', 'eventName'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const rpcUrl = (args as any)?.rpcUrl || DEFAULT_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    switch (name) {
      case 'get_contract_info': {
        const contractAddress = (args as any).contractAddress;
        if (!contractAddress) {
          throw new Error('contractAddress is required');
        }
        const contract = getContract(contractAddress);
        const [admin, nextShipmentId, nextCheckpointId, nextIncidentId] = await Promise.all([
          contract.admin(),
          contract.nextShipmentId(),
          contract.nextCheckpointId(),
          contract.nextIncidentId(),
        ]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  admin,
                  nextShipmentId: nextShipmentId.toString(),
                  nextCheckpointId: nextCheckpointId.toString(),
                  nextIncidentId: nextIncidentId.toString(),
                  totalShipments: (Number(nextShipmentId) - 1).toString(),
                  totalCheckpoints: (Number(nextCheckpointId) - 1).toString(),
                  totalIncidents: (Number(nextIncidentId) - 1).toString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_shipment': {
        const contractAddress = (args as any).contractAddress;
        const shipmentId = (args as any).shipmentId;
        if (!contractAddress || shipmentId === undefined) {
          throw new Error('contractAddress and shipmentId are required');
        }
        const contract = getContract(contractAddress);
        const shipment = await contract.shipments(shipmentId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: shipment.id.toString(),
                  sender: shipment.sender,
                  recipient: shipment.recipient,
                  product: shipment.product,
                  origin: shipment.origin,
                  destination: shipment.destination,
                  dateCreated: new Date(Number(shipment.dateCreated) * 1000).toISOString(),
                  dateEstimatedDelivery: new Date(Number(shipment.dateEstimatedDelivery) * 1000).toISOString(),
                  dateDelivered: shipment.dateDelivered > 0n ? new Date(Number(shipment.dateDelivered) * 1000).toISOString() : null,
                  status: formatShipmentStatus(shipment.status),
                  statusRaw: shipment.status.toString(),
                  requiresColdChain: shipment.requiresColdChain,
                  minTemperature: shipment.requiresColdChain ? (Number(shipment.minTemperature) / 10).toFixed(1) + '°C' : null,
                  maxTemperature: shipment.requiresColdChain ? (Number(shipment.maxTemperature) / 10).toFixed(1) + '°C' : null,
                  checkpointIds: shipment.checkpointIds.map((id: bigint) => id.toString()),
                  incidentIds: shipment.incidentIds.map((id: bigint) => id.toString()),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_all_shipments': {
        const contractAddress = (args as any).contractAddress;
        const limit = (args as any).limit || 50;
        if (!contractAddress) {
          throw new Error('contractAddress is required');
        }
        const contract = getContract(contractAddress);
        const nextShipmentId = await contract.nextShipmentId();
        const shipmentCount = Number(nextShipmentId) - 1;
        const maxId = Math.min(shipmentCount, limit);

        const shipments = [];
        for (let i = 1; i <= maxId; i++) {
          try {
            const shipment = await contract.shipments(i);
            shipments.push({
              id: shipment.id.toString(),
              sender: shipment.sender,
              recipient: shipment.recipient,
              product: shipment.product,
              status: formatShipmentStatus(shipment.status),
              dateCreated: new Date(Number(shipment.dateCreated) * 1000).toISOString(),
              checkpointCount: shipment.checkpointIds.length,
              incidentCount: shipment.incidentIds.length,
            });
          } catch (error) {
            // Skip invalid shipments
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: shipmentCount,
                  returned: shipments.length,
                  shipments,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_checkpoint': {
        const contractAddress = (args as any).contractAddress;
        const checkpointId = (args as any).checkpointId;
        if (!contractAddress || checkpointId === undefined) {
          throw new Error('contractAddress and checkpointId are required');
        }
        const contract = getContract(contractAddress);
        const checkpoint = await contract.checkpoints(checkpointId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: checkpoint.id.toString(),
                  shipmentId: checkpoint.shipmentId.toString(),
                  actor: checkpoint.actor,
                  location: checkpoint.location,
                  checkpointType: checkpoint.checkpointType,
                  timestamp: new Date(Number(checkpoint.timestamp) * 1000).toISOString(),
                  notes: checkpoint.notes,
                  temperature: checkpoint.temperature !== 0n ? (Number(checkpoint.temperature) / 10).toFixed(1) + '°C' : null,
                  latitude: checkpoint.latitude !== 0n ? (Number(checkpoint.latitude) / 1_000_000).toFixed(6) : null,
                  longitude: checkpoint.longitude !== 0n ? (Number(checkpoint.longitude) / 1_000_000).toFixed(6) : null,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_actor': {
        const contractAddress = (args as any).contractAddress;
        const actorAddress = (args as any).actorAddress;
        if (!contractAddress || !actorAddress) {
          throw new Error('contractAddress and actorAddress are required');
        }
        const contract = getContract(contractAddress);
        const actor = await contract.actors(actorAddress);

        if (actor.actorAddress === ethers.ZeroAddress) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Actor not found' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  actorAddress: actor.actorAddress,
                  name: actor.name,
                  role: formatActorRole(actor.role),
                  roleRaw: actor.role.toString(),
                  location: actor.location,
                  isActive: actor.isActive,
                  approvalStatus: formatApprovalStatus(actor.approvalStatus),
                  approvalStatusRaw: actor.approvalStatus.toString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_incident': {
        const contractAddress = (args as any).contractAddress;
        const incidentId = (args as any).incidentId;
        if (!contractAddress || incidentId === undefined) {
          throw new Error('contractAddress and incidentId are required');
        }
        const contract = getContract(contractAddress);
        const incident = await contract.incidents(incidentId);

        const types = ['Delay', 'Damage', 'Lost', 'TempViolation'];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: incident.id.toString(),
                  shipmentId: incident.shipmentId.toString(),
                  incidentType: types[Number(incident.incidentType)],
                  incidentTypeRaw: incident.incidentType.toString(),
                  reporter: incident.reporter,
                  description: incident.description,
                  timestamp: new Date(Number(incident.timestamp) * 1000).toISOString(),
                  resolved: incident.resolved,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_transaction': {
        const txHash = (args as any).txHash;
        if (!txHash) {
          throw new Error('txHash is required');
        }
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Transaction not found' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: ethers.formatEther(tx.value),
                  gasLimit: tx.gasLimit.toString(),
                  gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
                  nonce: tx.nonce,
                  data: tx.data,
                  blockNumber: tx.blockNumber,
                  blockHash: tx.blockHash,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_transaction_receipt': {
        const txHash = (args as any).txHash;
        if (!txHash) {
          throw new Error('txHash is required');
        }
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Transaction receipt not found' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hash: receipt.hash,
                  blockNumber: receipt.blockNumber.toString(),
                  blockHash: receipt.blockHash,
                  transactionIndex: receipt.index.toString(),
                  from: receipt.from,
                  to: receipt.to,
                  gasUsed: receipt.gasUsed.toString(),
                  effectiveGasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : null,
                  status: receipt.status === 1 ? 'success' : 'failed',
                  logs: receipt.logs.length,
                  contractAddress: receipt.contractAddress,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_balance': {
        const address = (args as any).address;
        if (!address) {
          throw new Error('address is required');
        }
        const balance = await provider.getBalance(address);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  balance: ethers.formatEther(balance),
                  balanceWei: balance.toString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_block_info': {
        const blockNumber = (args as any).blockNumber;
        if (!blockNumber) {
          throw new Error('blockNumber is required');
        }
        const block = await provider.getBlock(blockNumber === 'latest' ? 'latest' : Number(blockNumber));

        if (!block) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Block not found' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  number: block.number.toString(),
                  hash: block.hash,
                  parentHash: block.parentHash,
                  timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                  transactions: block.transactions.length,
                  gasLimit: block.gasLimit.toString(),
                  gasUsed: block.gasUsed?.toString() || null,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'query_contract_function': {
        const contractAddress = (args as any).contractAddress;
        const functionName = (args as any).functionName;
        const functionArgs = (args as any).args || [];
        if (!contractAddress || !functionName) {
          throw new Error('contractAddress and functionName are required');
        }
        const contract = getContract(contractAddress);
        const result = await contract[functionName](...functionArgs);

        // Handle different return types
        let formattedResult;
        if (Array.isArray(result)) {
          formattedResult = result.map((item: any) => {
            if (typeof item === 'bigint') {
              return item.toString();
            }
            return item;
          });
        } else if (typeof result === 'bigint') {
          formattedResult = result.toString();
        } else {
          formattedResult = result;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  function: functionName,
                  args: functionArgs,
                  result: formattedResult,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_contract_events': {
        const contractAddress = (args as any).contractAddress;
        const eventName = (args as any).eventName;
        const fromBlock = (args as any).fromBlock || 0;
        const toBlock = (args as any).toBlock || 'latest';
        if (!contractAddress || !eventName) {
          throw new Error('contractAddress and eventName are required');
        }
        const contract = getContract(contractAddress);
        const filter = contract.filters[eventName]();
        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  eventName,
                  count: events.length,
                  events: events.map((event: any) => ({
                    blockNumber: event.blockNumber.toString(),
                    transactionHash: event.transactionHash,
                    logIndex: event.index.toString(),
                    args: event.args ? Object.keys(event.args).reduce((acc: any, key: string) => {
                      if (isNaN(Number(key))) {
                        acc[key] = typeof event.args[key] === 'bigint' ? event.args[key].toString() : event.args[key];
                      }
                      return acc;
                    }, {}) : null,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message || 'Unknown error',
              stack: error.stack,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'anvil://contract-info',
        name: 'Contract Information',
        description: 'Basic information about the deployed SafeDelivery contract',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'anvil://contract-info') {
    if (!DEFAULT_CONTRACT_ADDRESS) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'CONTRACT_ADDRESS environment variable not set' }, null, 2),
          },
        ],
      };
    }

    try {
      const contract = getContract(DEFAULT_CONTRACT_ADDRESS);
      const [admin, nextShipmentId, nextCheckpointId, nextIncidentId] = await Promise.all([
        contract.admin(),
        contract.nextShipmentId(),
        contract.nextCheckpointId(),
        contract.nextIncidentId(),
      ]);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                contractAddress: DEFAULT_CONTRACT_ADDRESS,
                admin,
                nextShipmentId: nextShipmentId.toString(),
                nextCheckpointId: nextCheckpointId.toString(),
                nextIncidentId: nextIncidentId.toString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SafeDelivery MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

