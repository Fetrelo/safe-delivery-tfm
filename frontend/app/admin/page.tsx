'use client';

import { useState, useEffect } from 'react';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { getActor, ActorRole, ActorApprovalStatus } from '@/lib/contract';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actors, setActors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      checkAdminAndLoadActors();
    }
  }, [activeTab]);

  const checkAdminAndLoadActors = async () => {
    try {
      setLoading(true);
      const account = await getCurrentAccount();
      if (!account) {
        setLoading(false);
        return;
      }

      const contract = await getContract();
      const adminAddress = await contract.admin();
      const isUserAdmin = account.toLowerCase() === adminAddress.toLowerCase();
      setIsAdmin(isUserAdmin);

      if (!isUserAdmin) {
        setLoading(false);
        return;
      }

      // Get all actors - we'll need to track them manually or use events
      // For now, we'll use a simple approach: check common addresses
      // In production, you'd use events to track all registered actors
      await loadActors();
    } catch (error) {
      console.error('Error loading admin panel:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActors = async () => {
    // Note: This is a simplified version. In production, you'd query events
    // to get all registered actors. For now, we'll show a message.
    setActors([]);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Loading admin panel...</div>
      </div>
    );
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
            {(['pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-secondary border-b-2 border-secondary'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({filteredActors.length})
              </button>
            ))}
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
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{actor.name}</h3>
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
                    <p className="text-sm text-text-muted mb-1">
                      Address: {actor.actorAddress}
                    </p>
                    <p className="text-sm text-text-muted">Location: {actor.location}</p>
                    <p className="text-xs text-text-muted mt-2">
                      Active: {actor.isActive ? 'Yes' : 'No'}
                    </p>
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

