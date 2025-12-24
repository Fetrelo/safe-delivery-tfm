'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { ActorRole, getActor, ActorApprovalStatus, isAdmin as checkIsAdmin } from '@/lib/contract';

export default function RegisterActor() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [actorStatus, setActorStatus] = useState<{
    exists: boolean;
    approvalStatus: ActorApprovalStatus | null;
    actorData: any;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: ActorRole.Sender.toString(),
    location: '',
  });

  useEffect(() => {
    checkRegistrationStatus();
    
    // Listen for menu refresh events
    const handleMenuRefresh = () => {
      checkRegistrationStatus();
    };
    
    window.addEventListener('menuRefresh', handleMenuRefresh);
    
    return () => {
      window.removeEventListener('menuRefresh', handleMenuRefresh);
    };
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      setCheckingStatus(true);
      if (!CONTRACT_ADDRESS) {
        setCheckingStatus(false);
        return;
      }

      const account = await getCurrentAccount();
      if (!account) {
        setCheckingStatus(false);
        return;
      }

      // Check if user is admin - redirect to admin panel
      const adminStatus = await checkIsAdmin(account);
      if (adminStatus) {
        router.push('/admin');
        return;
      }

      const actor = await getActor(account);
      const exists = actor.actorAddress !== '0x0000000000000000000000000000000000000000';
      
      if (exists) {
        setActorStatus({
          exists: true,
          approvalStatus: actor.approvalStatus,
          actorData: actor,
        });
      } else {
        setActorStatus({
          exists: false,
          approvalStatus: null,
          actorData: null,
        });
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
      setActorStatus({
        exists: false,
        approvalStatus: null,
        actorData: null,
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!CONTRACT_ADDRESS) {
      alert('Contract not deployed. Please deploy the contract first.');
      return;
    }

    try {
      setLoading(true);
      const account = await getCurrentAccount();
      if (!account) {
        alert('Please connect your wallet');
        return;
      }

      const contract = await getContract();
      const tx = await contract.registerActor(
        formData.name,
        parseInt(formData.role),
        formData.location
      );

      await tx.wait();
      
      // Refresh status to show pending message
      await checkRegistrationStatus();
    } catch (error: any) {
      console.error('Error registering actor:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const roleOptions = [
    { value: ActorRole.Sender, label: 'Sender' },
    { value: ActorRole.Carrier, label: 'Carrier (Transportist)' },
    { value: ActorRole.Hub, label: 'Hub' },
    { value: ActorRole.Recipient, label: 'Recipient' },
    { value: ActorRole.Inspector, label: 'Inspector' },
    { value: ActorRole.Sensor, label: 'Sensor' },
  ];

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Checking registration status...</div>
      </div>
    );
  }

  // Show pending status message
  if (actorStatus?.exists && actorStatus.approvalStatus === ActorApprovalStatus.Pending) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Register Account</h1>
          <p className="text-text-muted">Registration Status</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-6 max-w-2xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⏳</span>
              <h2 className="text-xl font-semibold text-yellow-800">Registration Pending</h2>
            </div>
            <p className="text-yellow-700 mb-4">
              Your registration request has been submitted and is currently pending admin approval.
              You will be able to access the platform once an admin approves your account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Registration Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-text-muted">Name:</span>
                <p className="text-foreground font-medium">{actorStatus.actorData?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Role:</span>
                <p className="text-foreground font-medium">
                  {actorStatus.actorData ? getRoleLabel(actorStatus.actorData.role) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Location:</span>
                <p className="text-foreground font-medium">{actorStatus.actorData?.location || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Status:</span>
                <p className="text-foreground font-medium">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                    Pending Approval
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show rejected status message
  if (actorStatus?.exists && actorStatus.approvalStatus === ActorApprovalStatus.Rejected) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Register Account</h1>
          <p className="text-text-muted">Registration Status</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-6 max-w-2xl">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">❌</span>
              <h2 className="text-xl font-semibold text-red-800">Registration Rejected</h2>
            </div>
            <p className="text-red-700">
              Your registration request has been rejected by an admin. Please contact the administrator for more information.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Registration Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-text-muted">Name:</span>
                <p className="text-foreground font-medium">{actorStatus.actorData?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Role:</span>
                <p className="text-foreground font-medium">
                  {actorStatus.actorData ? getRoleLabel(actorStatus.actorData.role) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Location:</span>
                <p className="text-foreground font-medium">{actorStatus.actorData?.location || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-text-muted">Status:</span>
                <p className="text-foreground font-medium">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                    Rejected
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show approved status (shouldn't normally see this, but just in case)
  if (actorStatus?.exists && actorStatus.approvalStatus === ActorApprovalStatus.Approved) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Register Account</h1>
          <p className="text-text-muted">Registration Status</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-6 max-w-2xl">
          <div className="bg-green-50 border border-green-200 rounded-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✅</span>
              <h2 className="text-xl font-semibold text-green-800">Registration Approved</h2>
            </div>
            <p className="text-green-700 mb-4">
              Your account has been approved! You can now access all platform features.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show registration form if no registration exists
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Register Account</h1>
        <p className="text-text-muted">Register yourself as an actor in the logistics network</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Your name or company name"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Your location"
            />
          </div>

          <div className="bg-accent p-4 rounded-md">
            <p className="text-sm text-text-muted">
              <strong>Note:</strong> After registration, your account will be in "Pending" status. 
              An admin will need to approve your registration before you can interact with shipments.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
