'use client';

import { useState, useEffect } from 'react';
import { ActorRole } from '@/lib/contract';
import { CONTRACT_ADDRESS, getCurrentAccount } from '@/lib/web3';

export default function Dashboard() {
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    inTransit: number;
    atHub: number;
    outForDelivery: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<ActorRole | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isInspector, setIsInspector] = useState(false);

  useEffect(() => {
    checkRegistration();
    
    // Listen for menu refresh events
    const handleMenuRefresh = () => {
      checkRegistration();
    };
    
    window.addEventListener('menuRefresh', handleMenuRefresh);
    
    return () => {
      window.removeEventListener('menuRefresh', handleMenuRefresh);
    };
  }, []);

  const checkRegistration = async () => {
    if (!CONTRACT_ADDRESS) {
      setCheckingRegistration(false);
      setIsRegistered(false);
      return;
    }
    
    try {
      const currentAccount = await getCurrentAccount();
      if (!currentAccount) {
        setCheckingRegistration(false);
        setIsRegistered(false);
        return;
      }

      setAccount(currentAccount);
      
      // Check if user is admin (admins have access without registration)
      const { getActor, isActorRegistered, isAdmin, getAllShipments, isReadOnlyRole, ActorRole } = await import('@/lib/contract');
      const adminStatus = await isAdmin(currentAccount);
      setIsUserAdmin(adminStatus);
      
      if (adminStatus) {
        // Admin has access to all pages but cannot perform actor actions
        setIsRegistered(true);
        // Admins don't have an actor role, so userRole stays null
        // They can view but not create shipments or record checkpoints
        // Load dashboard stats for admin
        await loadDashboardStats();
      } else {
        // Check if user is registered in the contract (not just MetaMask connected)
        const actor = await getActor(currentAccount);
        
        // User is registered only if: exists, has valid role, is approved, and is active
        const registered = isActorRegistered(actor);
        setIsRegistered(registered);
        
        // Only load stats if user is registered
        if (registered) {
          const role = Number(actor.role);
          setUserRole(role);
          
          // Inspector role can view dashboard stats (read-only, like admin)
          if (isReadOnlyRole(role)) {
            setIsInspector(true);
            await loadDashboardStats();
          } else {
            // Regular users should not see dashboard - menu item is hidden for them
            setLoading(false);
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

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { getAllShipments, ShipmentStatus } = await import('@/lib/contract');
      const allShipments = await getAllShipments();
      
      // Calculate statistics
      const stats = {
        total: allShipments.length,
        active: allShipments.filter(
          (s) => s.status !== ShipmentStatus.Delivered && s.status !== ShipmentStatus.Cancelled
        ).length,
        completed: allShipments.filter((s) => s.status === ShipmentStatus.Delivered).length,
        cancelled: allShipments.filter((s) => s.status === ShipmentStatus.Cancelled).length,
        inTransit: allShipments.filter((s) => s.status === ShipmentStatus.InTransit).length,
        atHub: allShipments.filter((s) => s.status === ShipmentStatus.AtHub).length,
        outForDelivery: allShipments.filter((s) => s.status === ShipmentStatus.OutForDelivery).length,
      };
      
      setStats(stats);
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      setError(error.message || 'Failed to load dashboard statistics');
      setStats(null);
    } finally {
      setLoading(false);
    }
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

  // Registration check is handled by ProtectedRoute, but keep this as fallback
  if (!isRegistered && !checkingRegistration && !isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-text-muted mb-4">Redirecting to registration...</p>
      </div>
    );
  }

  // Dashboard is only for Admin and Inspector - if not authorized, don't render anything
  if (!isUserAdmin && !isInspector && !checkingRegistration && !loading) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-text-muted">Overview of all shipments in the system</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium mb-2">Error loading dashboard</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : !stats ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-muted">No data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Shipments */}
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-muted">Total Shipments</h3>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>

          {/* Active Shipments */}
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-muted">Active Shipments</h3>
              <span className="text-2xl">🚚</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.active}</p>
          </div>

          {/* Completed Shipments */}
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-muted">Completed</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>

          {/* Cancelled Shipments */}
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-muted">Cancelled</h3>
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Status Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm text-text-muted">In Transit</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inTransit}</p>
              </div>
              <span className="text-2xl">🚛</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-text-muted">At Hub</p>
                <p className="text-2xl font-bold text-purple-600">{stats.atHub}</p>
              </div>
              <span className="text-2xl">🏢</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm text-text-muted">Out for Delivery</p>
                <p className="text-2xl font-bold text-orange-600">{stats.outForDelivery}</p>
              </div>
              <span className="text-2xl">🚚</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
