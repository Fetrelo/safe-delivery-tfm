'use client';

import { useState, useEffect } from 'react';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { getActor, ActorRole, ActorApprovalStatus, isActorRegistered, isAdmin as checkIsAdmin, getAllActors } from '@/lib/contract';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actors, setActors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      setCheckingRegistration(true);
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
      const adminStatus = await checkIsAdmin(account);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Admin has access to admin panel without being registered as actor
        setIsRegistered(true);
        checkAdminAndLoadActors();
      } else {
        // Check if user is registered in the contract (not just MetaMask connected)
        const actor = await getActor(account);
        
        // User is registered only if: exists, has valid role, is approved, and is active
        const registered = isActorRegistered(actor);
        setIsRegistered(registered);

        // Only check admin status and load actors if user is registered
        if (registered) {
          checkAdminAndLoadActors();
        }
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const checkAdminAndLoadActors = async () => {
    try {
      setLoading(true);
      const account = await getCurrentAccount();
      if (!account) {
        setLoading(false);
        return;
      }

      // Check admin status using the contract function
      const adminStatus = await checkIsAdmin(account);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        setLoading(false);
        return;
      }

      // Load all actors by querying ActorRegistered events
      await loadActors();
    } catch (error) {
      console.error('Error loading admin panel:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActors = async () => {
    try {
      setLoading(true);
      const allActors = await getAllActors();
      console.log('Loaded actors:', allActors); // Debug log
      setActors(allActors);
    } catch (error: any) {
      console.error('Error loading actors:', error);
      alert(`Failed to load actors: ${error.message}`);
      setActors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (actorAddress: string) => {
    try {
      setProcessing(actorAddress);
      const contract = await getContract();
      const tx = await contract.setActorApprovalStatus(
        actorAddress,
        ActorApprovalStatus.Approved
      );
      await tx.wait();
      alert('Actor approved successfully!');
      await loadActors();
    } catch (error: any) {
      console.error('Error approving actor:', error);
      alert(`Failed to approve actor: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (actorAddress: string) => {
    try {
      setProcessing(actorAddress);
      const contract = await getContract();
      const tx = await contract.setActorApprovalStatus(
        actorAddress,
        ActorApprovalStatus.Rejected
      );
      await tx.wait();
      alert('Actor rejected successfully!');
      // Reload actors to reflect the change
      await loadActors();
    } catch (error: any) {
      console.error('Error rejecting actor:', error);
      alert(`Failed to reject actor: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const getRoleLabel = (role: ActorRole) => {
    const labels: Record<number, string> = {
      [ActorRole.Sender]: 'Sender',
      [ActorRole.Carrier]: 'Carrier',
      [ActorRole.Hub]: 'Hub',
      [ActorRole.Recipient]: 'Recipient',
      [ActorRole.Inspector]: 'Inspector',
      [ActorRole.Sensor]: 'Sensor',
    };
    return labels[role] || 'Unknown';
  };

  const getStatusLabel = (status: ActorApprovalStatus) => {
    const labels: Record<number, string> = {
      [ActorApprovalStatus.Pending]: 'Pending',
      [ActorApprovalStatus.Approved]: 'Approved',
      [ActorApprovalStatus.Rejected]: 'Rejected',
    };
    return labels[status] || 'Unknown';
  };

  const getStatusColor = (status: ActorApprovalStatus) => {
    const colors: Record<number, string> = {
      [ActorApprovalStatus.Pending]: 'bg-yellow-100 text-yellow-800',
      [ActorApprovalStatus.Approved]: 'bg-green-100 text-green-800',
      [ActorApprovalStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (checkingRegistration || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">
          {checkingRegistration ? 'Checking registration...' : 'Loading admin panel...'}
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return null; // Will be redirected by ProtectedRoute
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-text-muted mb-2">Access Denied</p>
          <p className="text-sm text-text-muted">You must be an admin to access this page</p>
        </div>
      </div>
    );
  }

  // Calculate counts for each tab (before filtering)
  const pendingCount = actors.filter(actor => actor.approvalStatus === ActorApprovalStatus.Pending).length;
  const approvedCount = actors.filter(actor => actor.approvalStatus === ActorApprovalStatus.Approved).length;
  const rejectedCount = actors.filter(actor => actor.approvalStatus === ActorApprovalStatus.Rejected).length;

  // Filter actors based on active tab
  const filteredActors = actors.filter(actor => {
    if (activeTab === 'pending') return actor.approvalStatus === ActorApprovalStatus.Pending;
    if (activeTab === 'approved') return actor.approvalStatus === ActorApprovalStatus.Approved;
    if (activeTab === 'rejected') return actor.approvalStatus === ActorApprovalStatus.Rejected;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-text-muted">Manage actor registrations and approvals</p>
      </div>

      <div className="bg-white rounded-lg border border-border">
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'approved'
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'rejected'
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        <div className="p-6">
          {actors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted mb-4">
                No actors found. Actor tracking will be implemented using event logs.
              </p>
              <p className="text-sm text-text-muted">
                In production, you would query the ActorRegistered event to get all registered actors.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActors.map((actor) => (
                <div
                  key={actor.actorAddress}
                  className="border border-border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {actor.name || 'Unnamed Actor'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          actor.approvalStatus
                        )}`}
                      >
                        {getStatusLabel(actor.approvalStatus)}
                      </span>
                      <span className="px-2 py-1 bg-accent text-secondary-dark rounded text-xs font-medium">
                        {getRoleLabel(actor.role)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Address:</span>{' '}
                        <span className="font-mono text-xs">{actor.actorAddress || 'N/A'}</span>
                      </p>
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Location:</span> {actor.location || 'N/A'}
                      </p>
                      <p className="text-xs text-text-muted mt-2">
                        <span className="font-medium">Active:</span> {actor.isActive ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(actor.actorAddress)}
                          disabled={processing === actor.actorAddress}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          {processing === actor.actorAddress ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(actor.actorAddress)}
                          disabled={processing === actor.actorAddress}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          {processing === actor.actorAddress ? 'Processing...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {activeTab === 'rejected' && (
                      <button
                        onClick={() => handleApprove(actor.actorAddress)}
                        disabled={processing === actor.actorAddress}
                        className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {processing === actor.actorAddress ? 'Processing...' : 'Approve'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

