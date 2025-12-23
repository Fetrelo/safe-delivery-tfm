import { ethers } from 'ethers';
import { getContract, getSigner } from './web3';

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

// Type definitions matching contract structs
export interface Shipment {
  id: bigint;
  sender: string;
  recipient: string;
  product: string;
  origin: string;
  destination: string;
  dateCreated: bigint;
  dateEstimatedDelivery: bigint;
  dateDelivered: bigint;
  status: ShipmentStatus;
  checkpointIds: bigint[];
  incidentIds: bigint[];
  requiresColdChain: boolean;
  minTemperature: bigint;
  maxTemperature: bigint;
}

export interface Checkpoint {
  id: bigint;
  shipmentId: bigint;
  actor: string;
  location: string;
  checkpointType: string;
  timestamp: bigint;
  notes: string;
  temperature: bigint;
  latitude: bigint;
  longitude: bigint;
}

export interface Incident {
  id: bigint;
  shipmentId: bigint;
  incidentType: IncidentType;
  reporter: string;
  description: string;
  timestamp: bigint;
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
  return {
    ...shipment,
    id: Number(shipment.id),
    dateCreated: Number(shipment.dateCreated),
    dateEstimatedDelivery: Number(shipment.dateEstimatedDelivery),
    dateDelivered: Number(shipment.dateDelivered),
    status: Number(shipment.status),
    checkpointIds: shipment.checkpointIds.map((id: bigint) => Number(id)),
    incidentIds: shipment.incidentIds.map((id: bigint) => Number(id)),
    minTemperature: Number(shipment.minTemperature),
    maxTemperature: Number(shipment.maxTemperature),
  };
}

export function convertCheckpoint(checkpoint: any): Checkpoint {
  return {
    ...checkpoint,
    id: Number(checkpoint.id),
    shipmentId: Number(checkpoint.shipmentId),
    timestamp: Number(checkpoint.timestamp),
    temperature: Number(checkpoint.temperature),
    latitude: Number(checkpoint.latitude),
    longitude: Number(checkpoint.longitude),
  };
}

export function convertIncident(incident: any): Incident {
  return {
    ...incident,
    id: Number(incident.id),
    shipmentId: Number(incident.shipmentId),
    timestamp: Number(incident.timestamp),
    incidentType: Number(incident.incidentType),
  };
}

export function convertActor(actor: any): Actor {
  return {
    ...actor,
    role: Number(actor.role),
    approvalStatus: Number(actor.approvalStatus),
  };
}

// Contract interaction functions
export async function getShipment(shipmentId: number): Promise<Shipment> {
  const contract = await getContract();
  const shipment = await contract.getShipment(shipmentId);
  return convertShipment(shipment);
}

export async function getCheckpoint(checkpointId: number): Promise<Checkpoint> {
  const contract = await getContract();
  const checkpoint = await contract.getCheckpoint(checkpointId);
  return convertCheckpoint(checkpoint);
}

export async function getIncident(incidentId: number): Promise<Incident> {
  const contract = await getContract();
  const incident = await contract.getIncident(incidentId);
  return convertIncident(incident);
}

export async function getActor(actorAddress: string): Promise<Actor> {
  const contract = await getContract();
  const actor = await contract.getActor(actorAddress);
  return convertActor(actor);
}

export async function getShipmentCheckpoints(shipmentId: number): Promise<Checkpoint[]> {
  const contract = await getContract();
  const checkpoints = await contract.getShipmentCheckpoints(shipmentId);
  return checkpoints.map(convertCheckpoint);
}

export async function getShipmentIncidents(shipmentId: number): Promise<Incident[]> {
  const contract = await getContract();
  const incidents = await contract.getShipmentIncidents(shipmentId);
  return incidents.map(convertIncident);
}

export async function getActorShipments(actorAddress: string): Promise<number[]> {
  const contract = await getContract();
  const shipmentIds = await contract.getActorShipments(actorAddress);
  return shipmentIds.map((id: bigint) => Number(id));
}

