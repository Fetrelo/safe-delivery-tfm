# Data Models

Data structure definitions for Safe Delivery smart contract structs.

## Shipment

```solidity
struct Shipment {
    uint256 id;
    address sender;
    address recipient;
    string product;
    string origin;
    string destination;
    uint256 dateCreated;
    uint256 dateEstimatedDelivery;
    uint256 dateDelivered;
    ShipmentStatus status;
    uint256[] checkpointIds;
    uint256[] incidentIds;
    bool requiresColdChain;
    int256 minTemperature;  // Temperature in celsius * 10 (for decimals)
    int256 maxTemperature;  // Temperature in celsius * 10 (for decimals)
}
```

**Fields:**
- `id`: Unique shipment identifier
- `sender`: Ethereum address of the Sender actor
- `recipient`: Ethereum address of the Recipient actor
- `product`: Product name/description
- `origin`: Origin location
- `destination`: Destination location
- `dateCreated`: Unix timestamp (seconds) when shipment was created
- `dateEstimatedDelivery`: Unix timestamp (seconds) for estimated delivery
- `dateDelivered`: Unix timestamp (seconds) when delivered, or 0 if not delivered
- `status`: Current shipment status (ShipmentStatus enum)
- `checkpointIds`: Array of checkpoint IDs associated with this shipment
- `incidentIds`: Array of incident IDs associated with this shipment
- `requiresColdChain`: Whether temperature monitoring is required
- `minTemperature`: Minimum allowed temperature in celsius × 10 (e.g., 25.5°C = 255)
- `maxTemperature`: Maximum allowed temperature in celsius × 10 (e.g., 30.0°C = 300)

---

## Checkpoint

```solidity
struct Checkpoint {
    uint256 id;
    uint256 shipmentId;
    address actor;
    string location;
    string checkpointType;  // "Pickup", "Hub", "Transit", "Delivery", "Report"
    uint256 timestamp;
    string notes;
    int256 temperature;     // Temperature in celsius * 10 (for decimals)
    int256 latitude;        // Latitude * 10^6 (for decimals)
    int256 longitude;       // Longitude * 10^6 (for decimals)
}
```

**Fields:**
- `id`: Unique checkpoint identifier
- `shipmentId`: ID of the associated shipment
- `actor`: Ethereum address of the actor who recorded this checkpoint
- `location`: Human-readable location description
- `checkpointType`: Type of checkpoint ("Pickup", "Hub", "Transit", "Delivery", or "Report")
- `timestamp`: Unix timestamp (seconds) when checkpoint was recorded
- `notes`: Additional notes or comments
- `temperature`: Temperature reading in celsius × 10 (0 if not applicable)
- `latitude`: Latitude coordinate × 10^6 (e.g., 40.7128° = 40712800)
- `longitude`: Longitude coordinate × 10^6 (e.g., -74.0060° = -74006000)

---

## Incident

```solidity
struct Incident {
    uint256 id;
    uint256 shipmentId;
    IncidentType incidentType;
    address reporter;
    string description;
    uint256 timestamp;
    bool resolved;  // Always false, incidents cannot be resolved
}
```

**Fields:**
- `id`: Unique incident identifier
- `shipmentId`: ID of the associated shipment
- `incidentType`: Type of incident (IncidentType enum: Delay, Damage, Lost, TempViolation)
- `reporter`: Ethereum address of the actor/system that reported the incident
- `description`: Human-readable description of the incident
- `timestamp`: Unix timestamp (seconds) when incident was created
- `resolved`: Always false - incidents cannot be resolved

---

## Actor

```solidity
struct Actor {
    address actorAddress;
    string name;
    ActorRole role;
    string location;
    bool isActive;
    ActorApprovalStatus approvalStatus;
}
```

**Fields:**
- `actorAddress`: Ethereum address that uniquely identifies the actor
- `name`: Actor's name or organization name
- `role`: The role assigned to this actor (ActorRole enum)
- `location`: Actor's physical location
- `isActive`: Whether the actor is currently active
- `approvalStatus`: Approval status (ActorApprovalStatus enum: Pending, Approved, Rejected)
