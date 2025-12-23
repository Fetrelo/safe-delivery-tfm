'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { ActorRole } from '@/lib/contract';

export default function RegisterActor() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: ActorRole.Sender.toString(),
    location: '',
  });

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
      
      alert('Actor registration submitted! Waiting for admin approval.');
      router.push('/');
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

  const roleOptions = [
    { value: ActorRole.Sender, label: 'Sender' },
    { value: ActorRole.Carrier, label: 'Carrier (Transportist)' },
    { value: ActorRole.Hub, label: 'Hub' },
    { value: ActorRole.Recipient, label: 'Recipient' },
    { value: ActorRole.Inspector, label: 'Inspector' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Register as Actor</h1>
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

