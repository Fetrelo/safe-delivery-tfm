'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActorShipments, getShipment, ShipmentStatus, ActorRole } from '@/lib/contract';
import { getContract, CONTRACT_ADDRESS, getCurrentAccount } from '@/lib/web3';

export default function Dashboard() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<ActorRole | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      
      if (!CONTRACT_ADDRESS) {
        setLoading(false);
        return;
      }
      
      const currentAccount = await getCurrentAccount();
      if (!currentAccount) {
        setLoading(false);
        return;
      }

      setAccount(currentAccount);
      
      // Get user's actor info
      const contract = await getContract();
      const actor = await contract.getActor(currentAccount);
      
      if (actor.actorAddress !== '0x0000000000000000000000000000000000000000') {
        setUserRole(Number(actor.role));
      }

      // Get shipments based on role
      const shipmentIds = await getActorShipments(currentAccount);
      const shipmentData = await Promise.all(
        shipmentIds.map(async (id) => {
          const shipment = await getShipment(id);
          return shipment;
        })
      );

      // Filter based on role
      let filteredShipments = shipmentData;
      if (userRole === ActorRole.Carrier) {
        // Carriers see Created, InTransit, OutForDelivery
        filteredShipments = shipmentData.filter(
          (s) =>
            s.status === ShipmentStatus.Created ||
            s.status === ShipmentStatus.InTransit ||
            s.status === ShipmentStatus.OutForDelivery
        );
      } else if (userRole === ActorRole.Sender || userRole === ActorRole.Recipient) {
        // Senders and Recipients see all their shipments
        filteredShipments = shipmentData;
      } else if (userRole === ActorRole.Hub) {
        // Hubs see InTransit and AtHub
        filteredShipments = shipmentData.filter(
          (s) =>
            s.status === ShipmentStatus.InTransit ||
            s.status === ShipmentStatus.AtHub
        );
      }

      setShipments(filteredShipments);
    } catch (error) {
      console.error('Error loading shipments:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Loading shipments...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-text-muted mb-4">Please connect your MetaMask wallet to view shipments</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-text-muted">View and manage your shipments</p>
      </div>

      {shipments.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-muted mb-4">No shipments found</p>
          <Link
            href="/shipments/create"
            className="inline-block px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
          >
            Create Your First Shipment
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {shipments.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/shipments/${shipment.id}`}
              className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {shipment.product}
                  </h3>
                  <p className="text-sm text-text-muted">
                    ID: {shipment.id} • From: {shipment.origin} → To: {shipment.destination}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    shipment.status
                  )}`}
                >
                  {getStatusLabel(shipment.status)}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-text-muted">
                <span>Created: {new Date(Number(shipment.dateCreated) * 1000).toLocaleDateString()}</span>
                {shipment.requiresColdChain && (
                  <span className="text-secondary">❄️ Cold Chain Required</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
