// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SafeDelivery.sol";

contract SafeDeliveryTest is Test {
    SafeDelivery public safeDelivery;
    
    address public admin;
    address public sender;
    address public carrier;
    address public hub;
    address public recipient;
    address public sensor;
    
    uint256 public constant TEMP_MIN = 20;  // 2.0°C * 10
    uint256 public constant TEMP_MAX = 40;  // 4.0°C * 10
    
    event ShipmentCreated(uint256 indexed shipmentId, address indexed sender, address indexed recipient, string product);
    event ActorRegistered(address indexed actorAddress, string name, SafeDelivery.ActorRole role);
    event ActorApprovalStatusChanged(address indexed actorAddress, SafeDelivery.ActorApprovalStatus newStatus);
    event CheckpointRecorded(uint256 indexed checkpointId, uint256 indexed shipmentId, string location, address actor);
    event ShipmentStatusChanged(uint256 indexed shipmentId, SafeDelivery.ShipmentStatus newStatus);
    event IncidentReported(uint256 indexed incidentId, uint256 indexed shipmentId, SafeDelivery.IncidentType incidentType);
    event DeliveryConfirmed(uint256 indexed shipmentId, address indexed recipient, uint256 timestamp);

    function setUp() public {
        admin = address(this);  // Test contract is admin
        sender = address(0x1);
        carrier = address(0x2);
        hub = address(0x3);
        recipient = address(0x4);
        sensor = address(0x5);
        
        safeDelivery = new SafeDelivery();
    }

    // ============ Helper Functions ============

    function _registerAndApproveActor(
        address actor,
        string memory name,
        SafeDelivery.ActorRole role,
        string memory location
    ) internal {
        vm.prank(actor);
        safeDelivery.registerActor(name, role, location);
        
        vm.prank(admin);
        safeDelivery.setActorApprovalStatus(actor, SafeDelivery.ActorApprovalStatus.Approved);
    }

    function _createShipment(
        address _carrier,
        address _recipient,
        bool requiresColdChain
    ) internal returns (uint256) {
        uint256 estimatedDelivery = block.timestamp + 2 days;
        vm.prank(_carrier);
        return safeDelivery.createShipment(
            _recipient,
            "Test Product",
            "Origin",
            "Destination",
            requiresColdChain,
            estimatedDelivery,
            int256(TEMP_MIN),
            int256(TEMP_MAX)
        );
    }

    // ============ Actor Management Tests ============

    function test_RegisterActor() public {
        vm.prank(sender);
        safeDelivery.registerActor("Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        SafeDelivery.Actor memory actor = safeDelivery.getActor(sender);
        assertEq(actor.actorAddress, sender);
        assertEq(actor.name, "Test Sender");
        assertEq(uint256(actor.role), uint256(SafeDelivery.ActorRole.Sender));
        assertEq(uint256(actor.approvalStatus), uint256(SafeDelivery.ActorApprovalStatus.Pending));
    }

    function test_AdminCanApproveActor() public {
        vm.prank(sender);
        safeDelivery.registerActor("Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        vm.prank(admin);
        safeDelivery.setActorApprovalStatus(sender, SafeDelivery.ActorApprovalStatus.Approved);
        
        SafeDelivery.Actor memory actor = safeDelivery.getActor(sender);
        assertEq(uint256(actor.approvalStatus), uint256(SafeDelivery.ActorApprovalStatus.Approved));
    }

    function test_AdminCanRejectActor() public {
        vm.prank(sender);
        safeDelivery.registerActor("Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        vm.prank(admin);
        safeDelivery.setActorApprovalStatus(sender, SafeDelivery.ActorApprovalStatus.Rejected);
        
        SafeDelivery.Actor memory actor = safeDelivery.getActor(sender);
        assertEq(uint256(actor.approvalStatus), uint256(SafeDelivery.ActorApprovalStatus.Rejected));
    }

    function test_AdminCanApprovePreviouslyRejectedActor() public {
        vm.prank(sender);
        safeDelivery.registerActor("Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        vm.prank(admin);
        safeDelivery.setActorApprovalStatus(sender, SafeDelivery.ActorApprovalStatus.Rejected);
        
        vm.prank(admin);
        safeDelivery.setActorApprovalStatus(sender, SafeDelivery.ActorApprovalStatus.Approved);
        
        SafeDelivery.Actor memory actor = safeDelivery.getActor(sender);
        assertEq(uint256(actor.approvalStatus), uint256(SafeDelivery.ActorApprovalStatus.Approved));
    }

    function test_OnlyAdminCanApproveActor() public {
        vm.prank(sender);
        safeDelivery.registerActor("Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        vm.prank(carrier);
        vm.expectRevert("Only admin can perform this action");
        safeDelivery.setActorApprovalStatus(sender, SafeDelivery.ActorApprovalStatus.Approved);
    }

    function test_DeactivateActor() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        vm.prank(admin);
        safeDelivery.deactivateActor(sender);
        
        SafeDelivery.Actor memory actor = safeDelivery.getActor(sender);
        assertEq(actor.isActive, false);
    }

    // ============ Shipment Management Tests ============

    function test_CreateShipment() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 estimatedDelivery = block.timestamp + 2 days;
        vm.prank(sender);
        uint256 shipmentId = safeDelivery.createShipment(
            recipient,
            "Test Product",
            "Origin",
            "Destination",
            true,
            estimatedDelivery,
            int256(TEMP_MIN),
            int256(TEMP_MAX)
        );
        
        assertEq(shipmentId, 1);
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(shipment.sender, sender);
        assertEq(shipment.recipient, recipient);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.Created));
        assertEq(shipment.requiresColdChain, true);
    }

    function test_OnlySenderCanCreateShipment() public {
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 estimatedDelivery = block.timestamp + 2 days;
        vm.prank(carrier);
        vm.expectRevert("Only Sender can create shipments");
        safeDelivery.createShipment(
            recipient,
            "Test Product",
            "Origin",
            "Destination",
            false,
            estimatedDelivery,
            0,
            0
        );
    }

    function test_OnlyApprovedActorCanCreateShipment() public {
        // Register but don't approve a sender
        address unapprovedSender = address(0x10);
        vm.prank(unapprovedSender);
        safeDelivery.registerActor("Unapproved Sender", SafeDelivery.ActorRole.Sender, "Location");
        
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 estimatedDelivery = block.timestamp + 2 days;
        vm.prank(unapprovedSender);
        vm.expectRevert("Actor must be approved");
        safeDelivery.createShipment(
            recipient,
            "Test Product",
            "Origin",
            "Destination",
            false,
            estimatedDelivery,
            0,
            0
        );
    }

    function test_UpdateShipmentStatus() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(carrier);
        safeDelivery.updateShipmentStatus(shipmentId, SafeDelivery.ShipmentStatus.InTransit);
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.InTransit));
    }

    function test_OnlySenderCarrierOrHubCanUpdateStatus() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(recipient);
        vm.expectRevert("Only Sender, Carrier, or Hub can update status");
        safeDelivery.updateShipmentStatus(shipmentId, SafeDelivery.ShipmentStatus.InTransit);
    }

    function test_ConfirmDelivery() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(hub, "Test Hub", SafeDelivery.ActorRole.Hub, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // Created -> InTransit (via Pickup checkpoint)
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // InTransit -> AtHub (via Hub checkpoint)
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // AtHub -> OutForDelivery (via Pickup checkpoint)
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 3",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        vm.prank(recipient);
        safeDelivery.confirmDelivery(shipmentId);
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.Delivered));
        assertGt(shipment.dateDelivered, 0);
    }

    function test_OnlyRecipientCanConfirmDelivery() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(hub, "Test Hub", SafeDelivery.ActorRole.Hub, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // Move to OutForDelivery via checkpoints
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 3",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        vm.prank(carrier);
        vm.expectRevert("Only Recipient can confirm delivery");
        safeDelivery.confirmDelivery(shipmentId);
    }

    function test_CancelShipment() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(sender);
        safeDelivery.cancelShipment(shipmentId);
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.Cancelled));
    }

    function test_OnlySenderCanCancelShipment() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(carrier);
        vm.expectRevert("Only Sender can cancel shipments");
        safeDelivery.cancelShipment(shipmentId);
    }

    // ============ Checkpoint Tests ============

    function test_RecordCheckpoint() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(carrier);
        uint256 checkpointId = safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),  // 40.0 degrees latitude
            int256(-70000000), // -70.0 degrees longitude
            false
        );
        
        assertEq(checkpointId, 1);
        SafeDelivery.Checkpoint memory checkpoint = safeDelivery.getCheckpoint(checkpointId);
        assertEq(checkpoint.shipmentId, shipmentId);
        assertEq(checkpoint.actor, carrier);
    }

    function test_CheckpointAutoUpdatesStatusPickup() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.InTransit));
    }

    function test_CheckpointAutoUpdatesStatusHub() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(hub, "Test Hub", SafeDelivery.ActorRole.Hub, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // First, move to InTransit
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // Then, Hub checkpoint
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.AtHub));
    }

    function test_TemperatureViolationIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, true);
        
        // Record checkpoint with temperature out of range
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            int256(50),  // 5.0°C, out of range (2.0-4.0°C)
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Incident[] memory incidents = safeDelivery.getShipmentIncidents(shipmentId);
        assertEq(incidents.length, 1);
        assertEq(uint256(incidents[0].incidentType), uint256(SafeDelivery.IncidentType.TempViolation));
    }

    function test_DamageIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            true  // hasDamage
        );
        
        SafeDelivery.Incident[] memory incidents = safeDelivery.getShipmentIncidents(shipmentId);
        assertEq(incidents.length, 1);
        assertEq(uint256(incidents[0].incidentType), uint256(SafeDelivery.IncidentType.Damage));
    }

    function test_DelayIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 estimatedDelivery = block.timestamp + 1 days;
        vm.prank(sender);
        uint256 shipmentId = safeDelivery.createShipment(
            recipient,
            "Test Product",
            "Origin",
            "Destination",
            false,
            estimatedDelivery,
            0,
            0
        );
        
        // Move time forward beyond estimated delivery but less than 1 hour (to get Delay, not Lost)
        vm.warp(block.timestamp + 1 days + 30 minutes);
        
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Transit",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Incident[] memory incidents = safeDelivery.getShipmentIncidents(shipmentId);
        assertEq(incidents.length, 1);
        assertEq(uint256(incidents[0].incidentType), uint256(SafeDelivery.IncidentType.Delay));
    }

    function test_LostIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 estimatedDelivery = block.timestamp + 1 days;
        vm.prank(sender);
        uint256 shipmentId = safeDelivery.createShipment(
            recipient,
            "Test Product",
            "Origin",
            "Destination",
            false,
            estimatedDelivery,
            0,
            0
        );
        
        // Move time forward beyond estimated delivery + 8 hours
        vm.warp(block.timestamp + 1 days + 9 hours);
        
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Transit",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Incident[] memory incidents = safeDelivery.getShipmentIncidents(shipmentId);
        assertEq(incidents.length, 1);
        assertEq(uint256(incidents[0].incidentType), uint256(SafeDelivery.IncidentType.Lost));
        
        // Check that shipment status is automatically set to Cancelled
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.Cancelled));
    }

    function test_SensorCanRecordCheckpoint() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(sensor, "Test Sensor", SafeDelivery.ActorRole.Sensor, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // First move to InTransit (needs Carrier)
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // Sensor can record Transit checkpoints
        vm.prank(sensor);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Transit",
            "Auto checkpoint",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Checkpoint[] memory checkpoints = safeDelivery.getShipmentCheckpoints(shipmentId);
        assertEq(checkpoints.length, 2);
    }

    // ============ Incident Tests ============

    function test_ReportIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // Carrier records checkpoint to be involved
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        vm.prank(carrier);
        uint256 incidentId = safeDelivery.reportIncident(
            shipmentId,
            SafeDelivery.IncidentType.Damage,
            "Package damaged"
        );
        
        assertEq(incidentId, 1);
        SafeDelivery.Incident memory incident = safeDelivery.getIncident(incidentId);
        assertEq(incident.shipmentId, shipmentId);
        assertEq(uint256(incident.incidentType), uint256(SafeDelivery.IncidentType.Damage));
    }

    function test_OnlyInvolvedActorCanReportIncident() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        address stranger = address(0x99);
        _registerAndApproveActor(stranger, "Stranger", SafeDelivery.ActorRole.Inspector, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        vm.prank(stranger);
        vm.expectRevert("Actor not involved in this shipment");
        safeDelivery.reportIncident(
            shipmentId,
            SafeDelivery.IncidentType.Damage,
            "Package damaged"
        );
    }

    // ============ Utility Function Tests ============

    function test_GetActorShipments() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(hub, "Test Hub", SafeDelivery.ActorRole.Hub, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId1 = _createShipment(sender, recipient, false);
        uint256 shipmentId2 = _createShipment(sender, recipient, false);
        
        // Sender and recipient should be in actorShipments after creation
        uint256[] memory senderShipments = safeDelivery.getActorShipments(sender);
        assertEq(senderShipments.length, 2);
        assertEq(senderShipments[0], shipmentId1);
        assertEq(senderShipments[1], shipmentId2);
        
        // Carrier should not be in actorShipments yet
        uint256[] memory carrierShipmentsBefore = safeDelivery.getActorShipments(carrier);
        assertEq(carrierShipmentsBefore.length, 0);
        
        // Carrier records a checkpoint - should be added to actorShipments
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId1,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // Carrier should now be in actorShipments for shipmentId1
        uint256[] memory carrierShipmentsAfter = safeDelivery.getActorShipments(carrier);
        assertEq(carrierShipmentsAfter.length, 1);
        assertEq(carrierShipmentsAfter[0], shipmentId1);
        
        // Hub records a checkpoint - should be added to actorShipments
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId1,
            "Location 2",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // Hub should now be in actorShipments for shipmentId1
        uint256[] memory hubShipments = safeDelivery.getActorShipments(hub);
        assertEq(hubShipments.length, 1);
        assertEq(hubShipments[0], shipmentId1);
    }

    function test_VerifyTemperatureCompliance() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, true);
        
        // Record checkpoint with valid temperature
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            int256(30),  // 3.0°C, within range
            int256(40000000),
            int256(-70000000),
            false
        );
        
        bool compliant = safeDelivery.verifyTemperatureCompliance(shipmentId);
        assertTrue(compliant);
        
        // Record checkpoint with invalid temperature
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Transit",
            "Notes",
            int256(50),  // 5.0°C, out of range
            int256(40000000),
            int256(-70000000),
            false
        );
        
        compliant = safeDelivery.verifyTemperatureCompliance(shipmentId);
        assertFalse(compliant);
    }

    function test_StatusTransitionOutForDeliveryToAtHub() public {
        _registerAndApproveActor(sender, "Test Sender", SafeDelivery.ActorRole.Sender, "Location");
        _registerAndApproveActor(carrier, "Test Carrier", SafeDelivery.ActorRole.Carrier, "Location");
        _registerAndApproveActor(hub, "Test Hub", SafeDelivery.ActorRole.Hub, "Location");
        _registerAndApproveActor(recipient, "Test Recipient", SafeDelivery.ActorRole.Recipient, "Location");
        
        uint256 shipmentId = _createShipment(sender, recipient, false);
        
        // Created -> InTransit
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 1",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // InTransit -> AtHub
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 2",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // AtHub -> OutForDelivery
        vm.prank(carrier);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 3",
            "Pickup",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        // OutForDelivery -> AtHub (exception)
        vm.prank(hub);
        safeDelivery.recordCheckpoint(
            shipmentId,
            "Location 4",
            "Hub",
            "Notes",
            0,
            int256(40000000),
            int256(-70000000),
            false
        );
        
        SafeDelivery.Shipment memory shipment = safeDelivery.getShipment(shipmentId);
        assertEq(uint256(shipment.status), uint256(SafeDelivery.ShipmentStatus.AtHub));
        
        // Verify we have 4 checkpoints (one for each step)
        SafeDelivery.Checkpoint[] memory checkpoints = safeDelivery.getShipmentCheckpoints(shipmentId);
        assertEq(checkpoints.length, 4);
    }
}

