'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentAccount, getActorShipments, getShipment, ShipmentStatus } from '@/lib/contract';
import { CONTRACT_ADDRESS } from '@/lib/web3';

export default function CompletedShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      loadShipments();
    }
  }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const account = await getCurrentAccount();
      if (!account) {
        setLoading(false);
        return;
      }

      const shipmentIds = await getActorShipments(account);
      const shipmentData = await Promise.all(
        shipmentIds.map(async (id) => {
          const shipment = await getShipment(id);
          return shipment;
        })
      );

      // Filter completed/cancelled shipments
      const completedShipments = shipmentData.filter(
        (s) =>
          s.status === ShipmentStatus.Delivered ||
          s.status === ShipmentStatus.Cancelled
      );

      setShipments(completedShipments);
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ShipmentStatus) => {
    const colors: Record<number, string> = {
      [ShipmentStatus.Delivered]: 'bg-green-100 text-green-800',
      [ShipmentStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: ShipmentStatus) => {
    const labels: Record<number, string> = {
      [ShipmentStatus.Delivered]: 'Delivered',
      [ShipmentStatus.Cancelled]: 'Cancelled',
    };
    return labels[status] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Loading completed shipments...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Completed / Cancelled Shipments</h1>
        <p className="text-text-muted">View your completed and cancelled shipments (read-only)</p>
      </div>

      {shipments.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-muted">No completed shipments found</p>
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
                {shipment.dateDelivered > 0 && (
                  <span>Delivered: {new Date(Number(shipment.dateDelivered) * 1000).toLocaleDateString()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

