// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeDelivery {
    // Enums
    enum ShipmentStatus { 
        Created, 
        InTransit, 
        AtHub, 
        OutForDelivery, 
        Delivered, 
        Returned, 
        Cancelled 
    }

    enum ActorRole { 
        None, 
        Sender, 
        Carrier, 
        Hub, 
        Recipient, 
        Inspector, 
        Sensor 
    }

    enum IncidentType { 
        Delay, 
        Damage, 
        Lost, 
        TempViolation 
    }

    enum ActorApprovalStatus {
        Pending,
        Approved,
        Rejected
    }

    // Structs
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

    struct Incident {
        uint256 id;
        uint256 shipmentId;
        IncidentType incidentType;
        address reporter;
        string description;
        uint256 timestamp;
        bool resolved;  // Always false, incidents cannot be resolved
    }

    struct Actor {
        address actorAddress;
        string name;
        ActorRole role;
        string location;
        bool isActive;
        ActorApprovalStatus approvalStatus;
    }

    // State variables
    address public admin;
    uint256 public nextShipmentId = 1;
    uint256 public nextCheckpointId = 1;
    uint256 public nextIncidentId = 1;

    // Mappings
    mapping(uint256 => Shipment) public shipments;
    mapping(uint256 => Checkpoint) public checkpoints;
    mapping(uint256 => Incident) public incidents;
    mapping(address => Actor) public actors;
    mapping(address => uint256[]) public actorShipments;  // Actor address => shipment IDs

    // Events
    event ShipmentCreated(
        uint256 indexed shipmentId,
        address indexed sender,
        address indexed recipient,
        string product
    );

    event CheckpointRecorded(
        uint256 indexed checkpointId,
        uint256 indexed shipmentId,
        string location,
        address actor
    );

    event ShipmentStatusChanged(
        uint256 indexed shipmentId,
        ShipmentStatus newStatus
    );

    event IncidentReported(
        uint256 indexed incidentId,
        uint256 indexed shipmentId,
        IncidentType incidentType
    );

    event IncidentResolved(
        uint256 indexed incidentId
    );

    event DeliveryConfirmed(
        uint256 indexed shipmentId,
        address indexed recipient,
        uint256 timestamp
    );

    event ActorRegistered(
        address indexed actorAddress,
        string name,
        ActorRole role
    );

    event ActorApprovalStatusChanged(
        address indexed actorAddress,
        ActorApprovalStatus newStatus
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyApprovedActor() {
        require(
            actors[msg.sender].approvalStatus == ActorApprovalStatus.Approved,
            "Actor must be approved"
        );
        require(actors[msg.sender].isActive, "Actor must be active");
        _;
    }

    modifier shipmentExists(uint256 _shipmentId) {
        require(shipments[_shipmentId].id != 0, "Shipment does not exist");
        _;
    }

    modifier validShipmentStatus(uint256 _shipmentId) {
        require(
            shipments[_shipmentId].status != ShipmentStatus.Delivered &&
            shipments[_shipmentId].status != ShipmentStatus.Cancelled,
            "Shipment is already delivered or cancelled"
        );
        _;
    }

    // Constructor
    constructor() {
        admin = msg.sender;
    }

    // ============ Gestión de Actores ============

    /**
     * @notice Register a new actor (anyone can call, but requires admin approval)
     */
    function registerActor(
        string memory _name,
        ActorRole _role,
        string memory _location
    ) public {
        require(
            actors[msg.sender].actorAddress == address(0),
            "Actor already registered"
        );
        require(_role != ActorRole.None, "Invalid role");

        actors[msg.sender] = Actor({
            actorAddress: msg.sender,
            name: _name,
            role: _role,
            location: _location,
            isActive: true,
            approvalStatus: ActorApprovalStatus.Pending
        });

        emit ActorRegistered(msg.sender, _name, _role);
    }

    /**
     * @notice Admin approves or rejects an actor
     */
    function setActorApprovalStatus(
        address _actorAddress,
        ActorApprovalStatus _status
    ) public onlyAdmin {
        require(
            actors[_actorAddress].actorAddress != address(0),
            "Actor does not exist"
        );
        actors[_actorAddress].approvalStatus = _status;
        emit ActorApprovalStatusChanged(_actorAddress, _status);
    }

    /**
     * @notice Get actor information
     */
    function getActor(address _actorAddress)
        public
        view
        returns (Actor memory)
    {
        return actors[_actorAddress];
    }

    /**
     * @notice Check if an address is the admin
     */
    function isAdmin(address _address) public view returns (bool) {
        return _address == admin;
    }

    /**
     * @notice Deactivate an actor (admin only)
     */
    function deactivateActor(address _actorAddress) public onlyAdmin {
        require(
            actors[_actorAddress].actorAddress != address(0),
            "Actor does not exist"
        );
        actors[_actorAddress].isActive = false;
    }

    // ============ Gestión de Envíos ============

    /**
     * @notice Create a new shipment (only approved Sender actors)
     */
    function createShipment(
        address _recipient,
        string memory _product,
        string memory _origin,
        string memory _destination,
        bool _requiresColdChain,
        uint256 _dateEstimatedDelivery,
        int256 _minTemperature,
        int256 _maxTemperature
    ) public onlyApprovedActor returns (uint256) {
        require(
            actors[msg.sender].role == ActorRole.Sender,
            "Only Sender can create shipments"
        );
        require(_recipient != address(0), "Invalid recipient address");

        uint256 shipmentId = nextShipmentId++;
        shipments[shipmentId] = Shipment({
            id: shipmentId,
            sender: msg.sender,
            recipient: _recipient,
            product: _product,
            origin: _origin,
            destination: _destination,
            dateCreated: block.timestamp,
            dateEstimatedDelivery: _dateEstimatedDelivery,
            dateDelivered: 0,
            status: ShipmentStatus.Created,
            checkpointIds: new uint256[](0),
            incidentIds: new uint256[](0),
            requiresColdChain: _requiresColdChain,
            minTemperature: _minTemperature,
            maxTemperature: _maxTemperature
        });

        actorShipments[msg.sender].push(shipmentId);
        actorShipments[_recipient].push(shipmentId);

        emit ShipmentCreated(shipmentId, msg.sender, _recipient, _product);
        return shipmentId;
    }

    /**
     * @notice Get shipment information
     */
    function getShipment(uint256 _shipmentId)
        public
        view
        returns (Shipment memory)
    {
        return shipments[_shipmentId];
    }

    /**
     * @notice Update shipment status (only Sender, Carrier, or Hub actors)
     */
    function updateShipmentStatus(
        uint256 _shipmentId,
        ShipmentStatus _newStatus
    )
        public
        onlyApprovedActor
        shipmentExists(_shipmentId)
        validShipmentStatus(_shipmentId)
    {
        ActorRole actorRole = actors[msg.sender].role;
        require(
            actorRole == ActorRole.Sender ||
            actorRole == ActorRole.Carrier ||
            actorRole == ActorRole.Hub,
            "Only Sender, Carrier, or Hub can update status"
        );

        // Validate status transition
        ShipmentStatus currentStatus = shipments[_shipmentId].status;
        require(
            isValidStatusTransition(currentStatus, _newStatus),
            "Invalid status transition"
        );

        shipments[_shipmentId].status = _newStatus;
        emit ShipmentStatusChanged(_shipmentId, _newStatus);
    }

    /**
     * @notice Confirm delivery (only Recipient)
     */
    function confirmDelivery(uint256 _shipmentId)
        public
        onlyApprovedActor
        shipmentExists(_shipmentId)
    {
        require(
            actors[msg.sender].role == ActorRole.Recipient,
            "Only Recipient can confirm delivery"
        );
        require(
            shipments[_shipmentId].recipient == msg.sender,
            "Only the shipment recipient can confirm"
        );
        require(
            shipments[_shipmentId].status == ShipmentStatus.OutForDelivery,
            "Shipment must be OutForDelivery"
        );

        shipments[_shipmentId].status = ShipmentStatus.Delivered;
        shipments[_shipmentId].dateDelivered = block.timestamp;

        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered);
        emit DeliveryConfirmed(_shipmentId, msg.sender, block.timestamp);
    }

    /**
     * @notice Cancel shipment (only Sender)
     */
    function cancelShipment(uint256 _shipmentId)
        public
        onlyApprovedActor
        shipmentExists(_shipmentId)
        validShipmentStatus(_shipmentId)
    {
        require(
            actors[msg.sender].role == ActorRole.Sender,
            "Only Sender can cancel shipments"
        );
        require(
            shipments[_shipmentId].sender == msg.sender,
            "Only the shipment sender can cancel"
        );

        shipments[_shipmentId].status = ShipmentStatus.Cancelled;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Cancelled);
    }

    // ============ Gestión de Checkpoints ============

    /**
     * @notice Record a checkpoint
     */
    function recordCheckpoint(
        uint256 _shipmentId,
        string memory _location,
        string memory _checkpointType,
        string memory _notes,
        int256 _temperature,
        int256 _latitude,
        int256 _longitude,
        bool _hasDamage
    ) public onlyApprovedActor shipmentExists(_shipmentId) returns (uint256) {
        Shipment storage shipment = shipments[_shipmentId];
        
        require(
            shipment.status != ShipmentStatus.Delivered &&
            shipment.status != ShipmentStatus.Cancelled,
            "Cannot record checkpoint for delivered or cancelled shipment"
        );

        // Validate actor role for checkpoint type
        ActorRole actorRole = actors[msg.sender].role;
        require(
            isValidActorForCheckpointType(actorRole, _checkpointType),
            "Actor role not authorized for this checkpoint type"
        );

        // Create checkpoint
        uint256 checkpointId = nextCheckpointId++;
        checkpoints[checkpointId] = Checkpoint({
            id: checkpointId,
            shipmentId: _shipmentId,
            actor: msg.sender,
            location: _location,
            checkpointType: _checkpointType,
            timestamp: block.timestamp,
            notes: _notes,
            temperature: _temperature,
            latitude: _latitude,
            longitude: _longitude
        });

        shipment.checkpointIds.push(checkpointId);

        // Add actor to actorShipments mapping if not already present
        // This allows actors to see shipments they're involved in
        _addActorToShipment(msg.sender, _shipmentId);

        // Update status based on checkpoint type
        updateStatusFromCheckpoint(_shipmentId, _checkpointType);

        // Temperature validation and incident creation
        if (shipment.requiresColdChain) {
            if (
                _temperature < shipment.minTemperature ||
                _temperature > shipment.maxTemperature
            ) {
                _createIncident(
                    _shipmentId,
                    IncidentType.TempViolation,
                    "Temperature out of range during checkpoint"
                );
            }
        }

        // Damage incident
        if (_hasDamage) {
            _createIncident(
                _shipmentId,
                IncidentType.Damage,
                "Damage reported during checkpoint"
            );
        }

        // Delay and Lost incident detection
        _checkDelayAndLost(_shipmentId);

        emit CheckpointRecorded(checkpointId, _shipmentId, _location, msg.sender);
        return checkpointId;
    }

    /**
     * @notice Get checkpoint information
     */
    function getCheckpoint(uint256 _checkpointId)
        public
        view
        returns (Checkpoint memory)
    {
        return checkpoints[_checkpointId];
    }

    /**
     * @notice Get all checkpoints for a shipment
     */
    function getShipmentCheckpoints(uint256 _shipmentId)
        public
        view
        returns (Checkpoint[] memory)
    {
        Shipment storage shipment = shipments[_shipmentId];
        Checkpoint[] memory result = new Checkpoint[](shipment.checkpointIds.length);
        
        for (uint256 i = 0; i < shipment.checkpointIds.length; i++) {
            result[i] = checkpoints[shipment.checkpointIds[i]];
        }
        
        return result;
    }

    // ============ Gestión de Incidencias ============

    /**
     * @notice Report an incident
     */
    function reportIncident(
        uint256 _shipmentId,
        IncidentType _incidentType,
        string memory _description
    ) public onlyApprovedActor shipmentExists(_shipmentId) returns (uint256) {
        // Verify actor is involved in shipment
        require(
            _isActorInvolvedInShipment(msg.sender, _shipmentId),
            "Actor not involved in this shipment"
        );

        return _createIncident(_shipmentId, _incidentType, _description);
    }

    /**
     * @notice Get incident information
     */
    function getIncident(uint256 _incidentId)
        public
        view
        returns (Incident memory)
    {
        return incidents[_incidentId];
    }

    /**
     * @notice Get all incidents for a shipment
     */
    function getShipmentIncidents(uint256 _shipmentId)
        public
        view
        returns (Incident[] memory)
    {
        Shipment storage shipment = shipments[_shipmentId];
        Incident[] memory result = new Incident[](shipment.incidentIds.length);
        
        for (uint256 i = 0; i < shipment.incidentIds.length; i++) {
            result[i] = incidents[shipment.incidentIds[i]];
        }
        
        return result;
    }

    // ============ Funciones auxiliares ============

    /**
     * @notice Get all shipments for an actor
     */
    function getActorShipments(address _actor)
        public
        view
        returns (uint256[] memory)
    {
        return actorShipments[_actor];
    }

    /**
     * @notice Verify temperature compliance for a shipment
     */
    function verifyTemperatureCompliance(uint256 _shipmentId)
        public
        view
        returns (bool)
    {
        Shipment storage shipment = shipments[_shipmentId];
        
        if (!shipment.requiresColdChain) {
            return true;  // No temperature requirements
        }

        if (shipment.checkpointIds.length == 0) {
            return true;  // No checkpoints yet
        }

        // Check all checkpoints
        for (uint256 i = 0; i < shipment.checkpointIds.length; i++) {
            Checkpoint memory checkpoint = checkpoints[shipment.checkpointIds[i]];
            
            if (
                checkpoint.temperature < shipment.minTemperature ||
                checkpoint.temperature > shipment.maxTemperature
            ) {
                return false;
            }
        }

        return true;
    }

    // ============ Funciones internas ============

    /**
     * @notice Create an incident (internal)
     */
    /**
     * @notice Add actor to actorShipments mapping if not already present
     */
    function _addActorToShipment(address _actor, uint256 _shipmentId) internal {
        uint256[] storage actorShipmentList = actorShipments[_actor];
        for (uint256 i = 0; i < actorShipmentList.length; i++) {
            if (actorShipmentList[i] == _shipmentId) {
                return; // Already added
            }
        }
        actorShipments[_actor].push(_shipmentId);
    }

    function _createIncident(
        uint256 _shipmentId,
        IncidentType _incidentType,
        string memory _description
    ) internal returns (uint256) {
        uint256 incidentId = nextIncidentId++;
        incidents[incidentId] = Incident({
            id: incidentId,
            shipmentId: _shipmentId,
            incidentType: _incidentType,
            reporter: msg.sender,
            description: _description,
            timestamp: block.timestamp,
            resolved: false
        });

        shipments[_shipmentId].incidentIds.push(incidentId);

        emit IncidentReported(incidentId, _shipmentId, _incidentType);

        // If Lost incident, automatically cancel shipment
        if (_incidentType == IncidentType.Lost) {
            shipments[_shipmentId].status = ShipmentStatus.Cancelled;
            emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Cancelled);
        }

        return incidentId;
    }

    /**
     * @notice Check for delay and lost incidents
     */
    function _checkDelayAndLost(uint256 _shipmentId) internal {
        Shipment storage shipment = shipments[_shipmentId];
        
        if (shipment.status == ShipmentStatus.Delivered || 
            shipment.status == ShipmentStatus.Cancelled) {
            return;
        }

        uint256 currentTime = block.timestamp;
        uint256 elapsedTime = currentTime - shipment.dateCreated;
        uint256 estimatedDuration = shipment.dateEstimatedDelivery - shipment.dateCreated;

        // Check if delayed
        if (elapsedTime > estimatedDuration) {
            // Check if Lost incident already exists
            bool hasLostIncident = false;
            for (uint256 i = 0; i < shipment.incidentIds.length; i++) {
                if (incidents[shipment.incidentIds[i]].incidentType == IncidentType.Lost) {
                    hasLostIncident = true;
                    break;
                }
            }

            if (!hasLostIncident) {
                // Check if delay is more than 8 hours
                if (elapsedTime > estimatedDuration + 8 hours) {
                    _createIncident(
                        _shipmentId,
                        IncidentType.Lost,
                        "Shipment lost - delay exceeds 8 hours"
                    );
                } else {
                    // Check if Delay incident already exists
                    bool hasDelayIncident = false;
                    for (uint256 i = 0; i < shipment.incidentIds.length; i++) {
                        if (incidents[shipment.incidentIds[i]].incidentType == IncidentType.Delay) {
                            hasDelayIncident = true;
                            break;
                        }
                    }
                    
                    if (!hasDelayIncident) {
                        _createIncident(
                            _shipmentId,
                            IncidentType.Delay,
                            "Shipment delayed beyond estimated delivery time"
                        );
                    }
                }
            }
        }
    }

    /**
     * @notice Update status based on checkpoint type
     */
    function updateStatusFromCheckpoint(
        uint256 _shipmentId,
        string memory _checkpointType
    ) internal {
        Shipment storage shipment = shipments[_shipmentId];
        
        if (
            keccak256(bytes(_checkpointType)) == keccak256(bytes("Pickup"))
        ) {
            if (shipment.status == ShipmentStatus.Created) {
                shipment.status = ShipmentStatus.InTransit;
                emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.InTransit);
            } else if (shipment.status == ShipmentStatus.AtHub) {
                shipment.status = ShipmentStatus.OutForDelivery;
                emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.OutForDelivery);
            }
        } else if (
            keccak256(bytes(_checkpointType)) == keccak256(bytes("Hub"))
        ) {
            if (shipment.status == ShipmentStatus.InTransit) {
                shipment.status = ShipmentStatus.AtHub;
                emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.AtHub);
            } else if (shipment.status == ShipmentStatus.OutForDelivery) {
                // Exception: OutForDelivery can return to AtHub
                shipment.status = ShipmentStatus.AtHub;
                emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.AtHub);
            }
        } else if (
            keccak256(bytes(_checkpointType)) == keccak256(bytes("Delivery"))
        ) {
            if (shipment.status == ShipmentStatus.OutForDelivery) {
                shipment.status = ShipmentStatus.Delivered;
                shipment.dateDelivered = block.timestamp;
                emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered);
                emit DeliveryConfirmed(_shipmentId, shipment.recipient, block.timestamp);
            }
        }
        // "Transit" and "Report" checkpoint types do not change status
    }

    /**
     * @notice Validate status transition
     */
    function isValidStatusTransition(
        ShipmentStatus _current,
        ShipmentStatus _new
    ) internal pure returns (bool) {
        // Normal flow
        if (_current == ShipmentStatus.Created && _new == ShipmentStatus.InTransit) {
            return true;
        }
        if (_current == ShipmentStatus.InTransit && _new == ShipmentStatus.AtHub) {
            return true;
        }
        if (_current == ShipmentStatus.AtHub && _new == ShipmentStatus.OutForDelivery) {
            return true;
        }
        if (_current == ShipmentStatus.OutForDelivery && _new == ShipmentStatus.Delivered) {
            return true;
        }
        
        // Exception: OutForDelivery can return to AtHub
        if (_current == ShipmentStatus.OutForDelivery && _new == ShipmentStatus.AtHub) {
            return true;
        }

        return false;
    }

    /**
     * @notice Check if actor role is valid for checkpoint type
     */
    function isValidActorForCheckpointType(
        ActorRole _role,
        string memory _checkpointType
    ) internal pure returns (bool) {
        bytes32 checkpointTypeHash = keccak256(bytes(_checkpointType));
        
        if (checkpointTypeHash == keccak256(bytes("Pickup"))) {
            return _role == ActorRole.Carrier || _role == ActorRole.Sensor;
        }
        if (checkpointTypeHash == keccak256(bytes("Hub"))) {
            return _role == ActorRole.Hub || _role == ActorRole.Sensor;
        }
        if (checkpointTypeHash == keccak256(bytes("Transit"))) {
            return _role == ActorRole.Carrier || _role == ActorRole.Sensor;
        }
        if (checkpointTypeHash == keccak256(bytes("Delivery"))) {
            return _role == ActorRole.Carrier || _role == ActorRole.Sensor;
        }
        if (checkpointTypeHash == keccak256(bytes("Report"))) {
            // Report checkpoint type is allowed for all roles
            return _role != ActorRole.None;
        }
        
        return false;
    }

    /**
     * @notice Check if actor is involved in shipment
     */
    function _isActorInvolvedInShipment(
        address _actor,
        uint256 _shipmentId
    ) internal view returns (bool) {
        Shipment storage shipment = shipments[_shipmentId];
        
        // Check if actor is sender or recipient
        if (_actor == shipment.sender || _actor == shipment.recipient) {
            return true;
        }
        
        // Check if actor has recorded any checkpoint
        for (uint256 i = 0; i < shipment.checkpointIds.length; i++) {
            if (checkpoints[shipment.checkpointIds[i]].actor == _actor) {
                return true;
            }
        }
        
        return false;
    }
}

