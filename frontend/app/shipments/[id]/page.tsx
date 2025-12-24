'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getShipment, 
  getShipmentCheckpoints, 
  getShipmentIncidents,
  ShipmentStatus,
  ActorRole,
  Checkpoint,
  Incident,
  getActor,
  isActorRegistered,
  isAdmin,
  isReadOnlyRole,
} from '@/lib/contract';
import { getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import CheckpointModal from '@/app/components/CheckpointModal';
import ShipmentMap from '@/app/components/ShipmentMap';

export default function ShipmentDetails() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = Number(params.id);
  
  const [shipment, setShipment] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [userRole, setUserRole] = useState<ActorRole | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      checkRegistrationAndLoad();
    }
    
    // Listen for menu refresh events
    const handleMenuRefresh = () => {
      if (CONTRACT_ADDRESS) {
        checkRegistrationAndLoad();
      }
    };
    
    window.addEventListener('menuRefresh', handleMenuRefresh);
    
    return () => {
      window.removeEventListener('menuRefresh', handleMenuRefresh);
    };
  }, [shipmentId]);

  const checkRegistrationAndLoad = async () => {
    try {
      if (!CONTRACT_ADDRESS) {
        router.replace('/actors/register');
        return;
      }

      const account = await getCurrentAccount();
      if (!account) {
        // Don't redirect if wallet not connected - let user connect first
        return;
      }

      // Check if user is admin (admins can view but not perform actor actions)
      const adminStatus = await isAdmin(account);
      
      if (adminStatus) {
        // Admin can view shipment details (without actor role)
        await loadData();
        return;
      }

      // Check if user is registered in the contract (not just MetaMask connected)
      const actor = await getActor(account);
      
      // User is registered only if: exists, has valid role, is approved, and is active
      const registered = isActorRegistered(actor);
      
      if (!registered) {
        router.replace('/actors/register');
        return;
      }

      // Inspector role can view shipment details (read-only, like admin)
      if (isReadOnlyRole(actor.role)) {
        await loadData();
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Error checking registration:', error);
      router.replace('/actors/register');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const account = await getCurrentAccount();
      setAccount(account);
      
      if (account) {
        const actor = await getActor(account);
        if (isActorRegistered(actor)) {
          setUserRole(actor.role);
        }
      }

      const [shipmentData, checkpointsData, incidentsData] = await Promise.all([
        getShipment(shipmentId),
        getShipmentCheckpoints(shipmentId),
        getShipmentIncidents(shipmentId),
      ]);

      setShipment(shipmentData);
      setCheckpoints(checkpointsData);
      setIncidents(incidentsData);

      // Fetch actor names for all unique checkpoint actors
      const uniqueActorAddresses = new Set<string>();
      checkpointsData.forEach(cp => {
        if (cp.actor && cp.actor !== '0x0000000000000000000000000000000000000000') {
          uniqueActorAddresses.add(cp.actor);
        }
      });
      incidentsData.forEach(inc => {
        if (inc.reporter && inc.reporter !== '0x0000000000000000000000000000000000000000') {
          uniqueActorAddresses.add(inc.reporter);
        }
      });

      // Fetch actor details for all unique addresses
      const actorNamesMap: Record<string, string> = {};
      await Promise.all(
        Array.from(uniqueActorAddresses).map(async (address) => {
          try {
            const actor = await getActor(address);
            actorNamesMap[address] = actor.name || address.substring(0, 6) + '...' + address.substring(address.length - 4);
          } catch (error) {
            console.warn(`Failed to fetch actor for ${address}:`, error);
            actorNamesMap[address] = address.substring(0, 6) + '...' + address.substring(address.length - 4);
          }
        })
      );
      setActorNames(actorNamesMap);
    } catch (error) {
      console.error('Error loading shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ShipmentStatus) => {
    const colors: Record<number, string> = {
      [ShipmentStatus.Created]: 'bg-blue-100 text-blue-800',
      [ShipmentStatus.InTransit]: 'bg-yellow-100 text-yellow-800',
      [ShipmentStatus.AtHub]: 'bg-purple-100 text-purple-800',
      [ShipmentStatus.OutForDelivery]: 'bg-orange-100 text-orange-800',
      [ShipmentStatus.Delivered]: 'bg-green-100 text-green-800',
      [ShipmentStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: ShipmentStatus) => {
    const labels: Record<number, string> = {
      [ShipmentStatus.Created]: 'Created',
      [ShipmentStatus.InTransit]: 'In Transit',
      [ShipmentStatus.AtHub]: 'At Hub',
      [ShipmentStatus.OutForDelivery]: 'Out for Delivery',
      [ShipmentStatus.Delivered]: 'Delivered',
      [ShipmentStatus.Cancelled]: 'Cancelled',
    };
    return labels[status] || 'Unknown';
  };

  const getIncidentTypeLabel = (type: number) => {
    const labels: Record<number, string> = {
      0: 'Delay',
      1: 'Damage',
      2: 'Lost',
      3: 'Temperature Violation',
    };
    return labels[type] || 'Unknown';
  };

  const getIncidentTypeColor = (type: number) => {
    const colors: Record<number, string> = {
      0: 'bg-yellow-100 text-yellow-800',
      1: 'bg-red-100 text-red-800',
      2: 'bg-red-100 text-red-800',
      3: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Combine checkpoints and incidents, sort by timestamp
  const timeline = [
    ...checkpoints.map(cp => ({ type: 'checkpoint' as const, data: cp, timestamp: Number(cp.timestamp) })),
    ...incidents.map(inc => ({ type: 'incident' as const, data: inc, timestamp: Number(inc.timestamp) })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const canRecordCheckpoint = () => {
    if (!userRole || !shipment) return false;
    // Inspector role cannot record checkpoints (read-only)
    if (isReadOnlyRole(userRole)) return false;
    if (shipment.status === ShipmentStatus.Delivered || shipment.status === ShipmentStatus.Cancelled) {
      return false;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Loading shipment details...</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Shipment not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-secondary hover:text-secondary-dark"
        >
          ← Back
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{shipment.product}</h1>
            <p className="text-text-muted">Shipment ID: {shipment.id}</p>
          </div>
          <div className="flex gap-4 items-center">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                shipment.status
              )}`}
            >
              {getStatusLabel(shipment.status)}
            </span>
            {canRecordCheckpoint() && userRole !== null && (
              <button
                onClick={() => setShowCheckpointModal(true)}
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors font-medium"
              >
                Record Checkpoint
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Shipment Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-text-muted">Origin:</span>
              <p className="font-medium">{shipment.origin}</p>
            </div>
            <div>
              <span className="text-sm text-text-muted">Destination:</span>
              <p className="font-medium">{shipment.destination}</p>
            </div>
            <div>
              <span className="text-sm text-text-muted">Sender:</span>
              <p className="font-medium text-sm">{shipment.sender}</p>
            </div>
            <div>
              <span className="text-sm text-text-muted">Recipient:</span>
              <p className="font-medium text-sm">{shipment.recipient}</p>
            </div>
            <div>
              <span className="text-sm text-text-muted">Created:</span>
              <p className="font-medium">
                {new Date(Number(shipment.dateCreated) * 1000).toLocaleString()}
              </p>
            </div>
            {shipment.dateEstimatedDelivery && (
              <div>
                <span className="text-sm text-text-muted">Estimated Delivery:</span>
                <p className="font-medium">
                  {new Date(Number(shipment.dateEstimatedDelivery) * 1000).toLocaleString()}
                </p>
              </div>
            )}
            {shipment.dateDelivered > 0 && (
              <div>
                <span className="text-sm text-text-muted">Delivered:</span>
                <p className="font-medium">
                  {new Date(Number(shipment.dateDelivered) * 1000).toLocaleString()}
                </p>
              </div>
            )}
            {shipment.requiresColdChain && (
              <div>
                <span className="text-sm text-text-muted">Temperature Range:</span>
                <p className="font-medium">
                  {Number(shipment.minTemperature) / 10}°C - {Number(shipment.maxTemperature) / 10}°C
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-text-muted">Checkpoints:</span>
              <p className="font-medium text-2xl">{checkpoints.length}</p>
            </div>
            <div>
              <span className="text-sm text-text-muted">Incidents:</span>
              <p className="font-medium text-2xl">{incidents.length}</p>
            </div>
            {shipment.requiresColdChain && (
              <div>
                <span className="text-sm text-text-muted">Cold Chain:</span>
                <p className="font-medium">❄️ Required</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Route Map</h2>
        <ShipmentMap checkpoints={checkpoints} />
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="text-text-muted">No activity recorded yet</p>
          ) : (
            timeline.map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-border last:border-0">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary mt-2"></div>
                <div className="flex-1">
                  {item.type === 'checkpoint' ? (
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-semibold">{(item.data as Checkpoint).location}</p>
                          <p className="text-sm text-text-muted">
                            {(item.data as Checkpoint).checkpointType} Checkpoint
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            Registered by: {actorNames[(item.data as Checkpoint).actor] || (item.data as Checkpoint).actor.substring(0, 6) + '...' + (item.data as Checkpoint).actor.substring((item.data as Checkpoint).actor.length - 4)}
                          </p>
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(item.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      {(item.data as Checkpoint).notes && (
                        <p className="text-sm text-text-muted mt-1">
                          {(item.data as Checkpoint).notes}
                        </p>
                      )}
                      {(item.data as Checkpoint).temperature !== 0 && (
                        <p className="text-sm text-text-muted mt-1">
                          Temperature: {Number((item.data as Checkpoint).temperature) / 10}°C
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getIncidentTypeColor(
                              (item.data as Incident).incidentType
                            )}`}
                          >
                            {getIncidentTypeLabel((item.data as Incident).incidentType)}
                          </span>
                          <p className="font-semibold">Incident Reported</p>
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(item.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Reported by: {actorNames[(item.data as Incident).reporter] || (item.data as Incident).reporter.substring(0, 6) + '...' + (item.data as Incident).reporter.substring((item.data as Incident).reporter.length - 4)}
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        {(item.data as Incident).description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCheckpointModal && shipment && userRole !== null && (
        <CheckpointModal
          shipmentId={shipmentId}
          currentStatus={shipment.status}
          userRole={userRole}
          checkpoints={checkpoints}
          onClose={() => setShowCheckpointModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

