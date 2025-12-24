import { ethers } from 'ethers';
import { getContract, getSigner, getProvider, CONTRACT_ADDRESS } from './web3';
import CONTRACT_ABI_JSON from './contract-abi.json';

const CONTRACT_ABI = CONTRACT_ABI_JSON as const;

// Contract types and enums
export enum ShipmentStatus {
  Created = 0,
  InTransit = 1,
  AtHub = 2,
  OutForDelivery = 3,
  Delivered = 4,
  Returned = 5,
  Cancelled = 6,
}

export enum ActorRole {
  None = 0,
  Sender = 1,
  Carrier = 2,
  Hub = 3,
  Recipient = 4,
  Inspector = 5,
  Sensor = 6,
}

export enum IncidentType {
  Delay = 0,
  Damage = 1,
  Lost = 2,
  TempViolation = 3,
}

export enum ActorApprovalStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

// Type definitions matching contract structs (after conversion)
export interface Shipment {
  id: number;
  sender: string;
  recipient: string;
  product: string;
  origin: string;
  destination: string;
  dateCreated: number;
  dateEstimatedDelivery: number;
  dateDelivered: number;
  status: ShipmentStatus;
  checkpointIds: number[];
  incidentIds: number[];
  requiresColdChain: boolean;
  minTemperature: number;
  maxTemperature: number;
}

export interface Checkpoint {
  id: number;
  shipmentId: number;
  actor: string;
  location: string;
  checkpointType: string;
  timestamp: number;
  notes: string;
  temperature: number;
  latitude: number;
  longitude: number;
}

export interface Incident {
  id: number;
  shipmentId: number;
  incidentType: IncidentType;
  reporter: string;
  description: string;
  timestamp: number;
  resolved: boolean;
}

export interface Actor {
  actorAddress: string;
  name: string;
  role: ActorRole;
  location: string;
  isActive: boolean;
  approvalStatus: ActorApprovalStatus;
}

// Helper function to convert bigint arrays to numbers
export function convertShipment(shipment: any): Shipment {
  // Handle both object and array formats from ethers
  const id = shipment.id !== undefined ? shipment.id : shipment[0];
  const sender = shipment.sender !== undefined ? shipment.sender : shipment[1];
  const recipient = shipment.recipient !== undefined ? shipment.recipient : shipment[2];
  const product = shipment.product !== undefined ? shipment.product : shipment[3];
  const origin = shipment.origin !== undefined ? shipment.origin : shipment[4];
  const destination = shipment.destination !== undefined ? shipment.destination : shipment[5];
  const dateCreated = shipment.dateCreated !== undefined ? shipment.dateCreated : shipment[6];
  const dateEstimatedDelivery = shipment.dateEstimatedDelivery !== undefined ? shipment.dateEstimatedDelivery : shipment[7];
  const dateDelivered = shipment.dateDelivered !== undefined ? shipment.dateDelivered : shipment[8];
  const status = shipment.status !== undefined ? shipment.status : shipment[9];
  const checkpointIds = shipment.checkpointIds !== undefined ? shipment.checkpointIds : shipment[10];
  const incidentIds = shipment.incidentIds !== undefined ? shipment.incidentIds : shipment[11];
  const requiresColdChain = shipment.requiresColdChain !== undefined ? shipment.requiresColdChain : shipment[12];
  const minTemperature = shipment.minTemperature !== undefined ? shipment.minTemperature : shipment[13];
  const maxTemperature = shipment.maxTemperature !== undefined ? shipment.maxTemperature : shipment[14];

  return {
    id: Number(id),
    sender: String(sender),
    recipient: String(recipient),
    product: String(product),
    origin: String(origin),
    destination: String(destination),
    dateCreated: Number(dateCreated),
    dateEstimatedDelivery: Number(dateEstimatedDelivery),
    dateDelivered: Number(dateDelivered),
    status: Number(status),
    checkpointIds: Array.isArray(checkpointIds) ? checkpointIds.map((id: any) => Number(id)) : [],
    incidentIds: Array.isArray(incidentIds) ? incidentIds.map((id: any) => Number(id)) : [],
    requiresColdChain: Boolean(requiresColdChain),
    minTemperature: Number(minTemperature),
    maxTemperature: Number(maxTemperature),
  };
}

export function convertCheckpoint(checkpoint: any): Checkpoint {
  // Handle both object and array formats from ethers
  const id = checkpoint.id !== undefined ? checkpoint.id : checkpoint[0];
  const shipmentId = checkpoint.shipmentId !== undefined ? checkpoint.shipmentId : checkpoint[1];
  const actor = checkpoint.actor !== undefined ? checkpoint.actor : checkpoint[2];
  const location = checkpoint.location !== undefined ? checkpoint.location : checkpoint[3];
  const checkpointType = checkpoint.checkpointType !== undefined ? checkpoint.checkpointType : checkpoint[4];
  const timestamp = checkpoint.timestamp !== undefined ? checkpoint.timestamp : checkpoint[5];
  const notes = checkpoint.notes !== undefined ? checkpoint.notes : checkpoint[6];
  const temperature = checkpoint.temperature !== undefined ? checkpoint.temperature : checkpoint[7];
  const latitude = checkpoint.latitude !== undefined ? checkpoint.latitude : checkpoint[8];
  const longitude = checkpoint.longitude !== undefined ? checkpoint.longitude : checkpoint[9];

  return {
    id: Number(id),
    shipmentId: Number(shipmentId),
    actor: String(actor),
    location: String(location),
    checkpointType: String(checkpointType),
    timestamp: Number(timestamp),
    notes: String(notes),
    temperature: Number(temperature),
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}

export function convertIncident(incident: any): Incident {
  // Handle both object and array formats from ethers
  const id = incident.id !== undefined ? incident.id : incident[0];
  const shipmentId = incident.shipmentId !== undefined ? incident.shipmentId : incident[1];
  const incidentType = incident.incidentType !== undefined ? incident.incidentType : incident[2];
  const reporter = incident.reporter !== undefined ? incident.reporter : incident[3];
  const description = incident.description !== undefined ? incident.description : incident[4];
  const timestamp = incident.timestamp !== undefined ? incident.timestamp : incident[5];
  const resolved = incident.resolved !== undefined ? incident.resolved : incident[6];

  return {
    id: Number(id),
    shipmentId: Number(shipmentId),
    incidentType: Number(incidentType),
    reporter: String(reporter),
    description: String(description),
    timestamp: Number(timestamp),
    resolved: Boolean(resolved),
  };
}

export function convertActor(actor: any): Actor {
  // Handle both object and array formats from ethers
  const actorAddress = actor.actorAddress || actor[0] || '';
  const name = actor.name || actor[1] || '';
  const role = Number(actor.role !== undefined ? actor.role : (actor[2] !== undefined ? actor[2] : 0));
  const location = actor.location || actor[3] || '';
  const isActive = actor.isActive !== undefined ? actor.isActive : (actor[4] !== undefined ? actor[4] : true);
  const approvalStatus = Number(actor.approvalStatus !== undefined ? actor.approvalStatus : (actor[5] !== undefined ? actor[5] : 0));
  
  return {
    actorAddress: String(actorAddress),
    name: String(name),
    role: role,
    location: String(location),
    isActive: Boolean(isActive),
    approvalStatus: approvalStatus,
  };
}

// Helper function to check if an actor is registered and approved
export function isActorRegistered(actor: Actor): boolean {
  // Actor must exist (address is not zero)
  const exists = actor.actorAddress !== '0x0000000000000000000000000000000000000000';
  
  // Actor must have a valid role (not None)
  const hasValidRole = actor.role !== ActorRole.None;
  
  // Actor must be approved
  const isApproved = actor.approvalStatus === ActorApprovalStatus.Approved;
  
  // Actor must be active
  const isActive = actor.isActive;
  
  return exists && hasValidRole && isApproved && isActive;
}

// Contract interaction functions
export async function getShipment(shipmentId: number): Promise<Shipment> {
  const contract = await getReadOnlyContract();
  const shipment = await contract.getShipment(shipmentId);
  return convertShipment(shipment);
}

export async function getCheckpoint(checkpointId: number): Promise<Checkpoint> {
  const contract = await getReadOnlyContract();
  const checkpoint = await contract.getCheckpoint(checkpointId);
  return convertCheckpoint(checkpoint);
}

export async function getIncident(incidentId: number): Promise<Incident> {
  const contract = await getReadOnlyContract();
  const incident = await contract.getIncident(incidentId);
  return convertIncident(incident);
}

export async function getActor(actorAddress: string): Promise<Actor> {
  const contract = await getReadOnlyContract();
  const actor = await contract.getActor(actorAddress);
  return convertActor(actor);
}

export async function getShipmentCheckpoints(shipmentId: number): Promise<Checkpoint[]> {
  const contract = await getReadOnlyContract();
  const checkpoints = await contract.getShipmentCheckpoints(shipmentId);
  return checkpoints.map(convertCheckpoint);
}

export async function getShipmentIncidents(shipmentId: number): Promise<Incident[]> {
  const contract = await getReadOnlyContract();
  const incidents = await contract.getShipmentIncidents(shipmentId);
  return incidents.map(convertIncident);
}

export async function getActorShipments(actorAddress: string): Promise<number[]> {
  const contract = await getReadOnlyContract();
  const shipmentIds = await contract.getActorShipments(actorAddress);
  return shipmentIds.map((id: bigint) => Number(id));
}

// Get next shipment ID (for querying all shipments)
export async function getNextShipmentId(): Promise<number> {
  const contract = await getReadOnlyContract();
  const nextId = await contract.nextShipmentId();
  return Number(nextId);
}

// Get all shipments (for admins)
export async function getAllShipments(): Promise<Shipment[]> {
  try {
    const nextId = await getNextShipmentId();
    const shipments: Shipment[] = [];
    
    for (let id = 1; id < nextId; id++) {
      try {
        const shipment = await getShipment(id);
        shipments.push(shipment);
      } catch (error) {
        // Shipment doesn't exist, log warning and continue
        console.warn(`Shipment ${id} does not exist, skipping...`);
      }
    }
    
    return shipments;
  } catch (error) {
    console.error('Error getting all shipments:', error);
    throw error;
  }
}

// Get all actors by querying ActorRegistered events
export async function getAllActors(): Promise<Actor[]> {
  try {
    const contract = await getReadOnlyContract();
    const provider = await getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    // Query ActorRegistered events from block 0 to latest
    const filter = contract.filters.ActorRegistered();
    const events = await contract.queryFilter(filter, 0);
    
    // Get actor details for each address found in events
    const actors: Actor[] = [];
    for (const event of events) {
      if (event.args && event.args[0]) {
        const actorAddress = event.args[0] as string;
        try {
          const actor = await getActor(actorAddress);
          // Only include if actor exists (address is not zero)
          if (actor.actorAddress !== '0x0000000000000000000000000000000000000000') {
            actors.push(actor);
          }
        } catch (error) {
          console.warn(`Failed to get actor details for ${actorAddress}:`, error);
        }
      }
    }
    
    return actors;
  } catch (error) {
    console.error('Error getting all actors:', error);
    throw error;
  }
}

// Get read-only contract instance (for view functions that don't require signer)
async function getReadOnlyContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set');
  }
  const provider = await getProvider();
  if (!provider) {
    throw new Error('Provider not available');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function isAdmin(address: string): Promise<boolean> {
  try {
    if (!CONTRACT_ADDRESS) return false;
    const contract = await getReadOnlyContract();
    return await contract.isAdmin(address);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
