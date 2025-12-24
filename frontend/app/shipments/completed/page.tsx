'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActorShipments, getShipment, getAllShipments, ShipmentStatus } from '@/lib/contract';
import { CONTRACT_ADDRESS, getCurrentAccount } from '@/lib/web3';

export default function CompletedShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      checkRegistration();
    }
    
    // Listen for menu refresh events
    const handleMenuRefresh = () => {
      if (CONTRACT_ADDRESS) {
        checkRegistration();
      }
    };
    
    window.addEventListener('menuRefresh', handleMenuRefresh);
    
    return () => {
      window.removeEventListener('menuRefresh', handleMenuRefresh);
    };
  }, []);

  const checkRegistration = async () => {
    try {
      if (!CONTRACT_ADDRESS) {
        setCheckingRegistration(false);
        setIsRegistered(false);
        return;
      }

      const account = await getCurrentAccount();
      if (!account) {
        setCheckingRegistration(false);
        setIsRegistered(false);
        return;
      }

      // Check if user is admin (admins have access without registration)
      const { getActor, isActorRegistered, isAdmin, getAllShipments, isReadOnlyRole, ActorRole } = await import('@/lib/contract');
      const adminStatus = await isAdmin(account);
      setIsUserAdmin(adminStatus);
      
      if (adminStatus) {
        // Admin has access to view pages
        setIsRegistered(true);
        // Load all completed/cancelled shipments for admin
        await loadAllCompletedShipments();
      } else {
        // Check if user is registered in the contract (not just MetaMask connected)
        const actor = await getActor(account);
        
        // User is registered only if: exists, has valid role, is approved, and is active
        const registered = isActorRegistered(actor);
        setIsRegistered(registered);
        
        // Only load shipments if user is registered
        if (registered) {
          const role = Number(actor.role);
          // Inspector role can view all completed shipments (read-only, like admin)
          if (isReadOnlyRole(role)) {
            await loadAllCompletedShipments();
          } else {
            await loadShipments();
          }
        } else {
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
      setError(error.message || 'Failed to check registration');
      setLoading(false);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const loadAllCompletedShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { getAllShipments } = await import('@/lib/contract');
      const allShipments = await getAllShipments();
      
      // Filter completed/cancelled shipments
      const completedShipments = allShipments.filter(
        (s) =>
          s.status === ShipmentStatus.Delivered ||
          s.status === ShipmentStatus.Cancelled
      );
      
      setShipments(completedShipments);
    } catch (error: any) {
      console.error('Error loading all completed shipments:', error);
      setError(error.message || 'Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error('Error loading shipments:', error);
      setError(error.message || 'Failed to load shipments');
      setShipments([]);
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

  if (checkingRegistration) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Checking registration...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Loading completed shipments...</div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-text-muted mb-4">You need to register your account first</p>
        <Link
          href="/actors/register"
          className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors font-medium"
        >
          Register Account
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Completed / Cancelled Shipments</h1>
        <p className="text-text-muted">View your completed and cancelled shipments (read-only)</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium mb-2">Error loading shipments</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : shipments.length === 0 ? (
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

