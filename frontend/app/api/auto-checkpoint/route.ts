import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import CONTRACT_ABI_JSON from '@/lib/contract-abi.json';

const CONTRACT_ABI = CONTRACT_ABI_JSON as any;

// This should be set in environment variables
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const SENSOR_PRIVATE_KEY = process.env.SENSOR_PRIVATE_KEY || '';
const SENSOR_ADDRESS = process.env.SENSOR_ADDRESS || '';

// Run every 10 minutes (600000 ms)
// In production, you'd use a proper cron job service or Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verify environment variables
    if (!CONTRACT_ADDRESS || !SENSOR_PRIVATE_KEY || !SENSOR_ADDRESS) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(SENSOR_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Get sensor actor info
    const sensorActor = await contract.getActor(SENSOR_ADDRESS);
    
    // Check if sensor is registered and approved
    if (sensorActor.actorAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Sensor actor not registered' },
        { status: 500 }
      );
    }

    if (Number(sensorActor.approvalStatus) !== 1) { // 1 = Approved
      return NextResponse.json(
        { error: 'Sensor actor not approved' },
        { status: 500 }
      );
    }

    // Get all shipments that need auto-checkpoints
    // Note: In a real implementation, you'd track shipment IDs from events
    // For now, we'll use a simple approach: try to get shipments by checking IDs
    const processedShipments: number[] = [];
    const maxShipmentId = 1000; // Adjust based on your needs
    
    for (let id = 1; id <= maxShipmentId; id++) {
      try {
        const shipment = await contract.getShipment(id);
        
        // Check if shipment exists (id will be non-zero if it exists)
        if (Number(shipment.id) === 0) continue;
        
        const status = Number(shipment.status);
        // Status 1 = InTransit, Status 3 = OutForDelivery
        if (status === 1 || status === 3) {
          // Get checkpoints for this shipment
          const checkpoints = await contract.getShipmentCheckpoints(id);
          
          // Get the latest checkpoint
          if (checkpoints.length > 0) {
            const latestCheckpoint = checkpoints[checkpoints.length - 1];
            const latestTimestamp = Number(latestCheckpoint.timestamp);
            const now = Math.floor(Date.now() / 1000);
            
            // Only create checkpoint if 10 minutes (600 seconds) have passed
            if (now - latestTimestamp >= 600) {
              // Get location from latest checkpoint or use default
              const location = latestCheckpoint.location || 'Auto Checkpoint';
              const latitude = latestCheckpoint.latitude || 0;
              const longitude = latestCheckpoint.longitude || 0;
              
              // Record checkpoint with "Report" type (doesn't change status)
              const tx = await contract.recordCheckpoint(
                id,
                location,
                'Report',
                'Automatic checkpoint recorded by sensor',
                0, // temperature (0 if not applicable)
                latitude,
                longitude,
                false // hasDamage
              );
              
              await tx.wait();
              processedShipments.push(id);
            }
          }
        }
      } catch (error) {
        // Shipment doesn't exist or error accessing it, continue
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedShipments.length} shipments`,
      shipments: processedShipments,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Auto-checkpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

