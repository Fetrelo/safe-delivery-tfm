'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { ActorRole, getActor, isActorRegistered, isAdmin as checkIsAdmin } from '@/lib/contract';

export default function CreateShipment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  
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
    try {
      setChecking(true);
      if (!CONTRACT_ADDRESS) {
        setChecking(false);
        setIsRegistered(false);
        router.replace('/actors/register');
        return;
      }

      const account = await getCurrentAccount();
      if (!account) {
        setChecking(false);
        setIsRegistered(false);
        // Don't redirect if wallet not connected - let user connect first
        return;
      }

      // Check if user is admin (admins cannot create shipments)
      const adminStatus = await checkIsAdmin(account);
      
      if (adminStatus) {
        // Admin cannot create shipments - redirect to admin panel
        router.replace('/admin');
        return;
      }

      // Check if user is registered in the contract (not just MetaMask connected)
      const actor = await getActor(account);
      
      // User is registered only if: exists, has valid role, is approved, and is active
      const registered = isActorRegistered(actor);
      setIsRegistered(registered);

      // If not registered, redirect to register page
      if (!registered) {
        router.replace('/actors/register');
        return;
      }

      // Check if user has Sender role (only Senders can create shipments)
      if (actor.role !== ActorRole.Sender) {
        // User doesn't have Sender role - redirect to dashboard
        router.replace('/');
        return;
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
      router.replace('/actors/register');
    } finally {
      setChecking(false);
    }
  };

  const [formData, setFormData] = useState({
    recipient: '',
    product: '',
    origin: '',
    destination: '',
    requiresColdChain: false,
    minTemperature: '',
    maxTemperature: '',
    estimatedDeliveryHours: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!CONTRACT_ADDRESS) {
      toast.error('Contract not deployed. Please deploy the contract first.');
      return;
    }

    try {
      setLoading(true);
      const account = await getCurrentAccount();
      if (!account) {
        toast.error('Please connect your wallet');
        return;
      }

      // Verify user has Sender role
      const actor = await getActor(account);
      if (actor.role !== ActorRole.Sender) {
        toast.error('Only Senders can create shipments.');
        setLoading(false);
        return;
      }

      const contract = await getContract();
      
      // Calculate estimated delivery timestamp
      const estimatedDeliveryHours = parseInt(formData.estimatedDeliveryHours);
      const estimatedDeliveryTimestamp = Math.floor(Date.now() / 1000) + (estimatedDeliveryHours * 60 * 60);
      
      // Convert temperatures (multiply by 10 for contract)
      const minTemp = formData.requiresColdChain 
        ? Math.floor(parseFloat(formData.minTemperature) * 10)
        : 0;
      const maxTemp = formData.requiresColdChain
        ? Math.floor(parseFloat(formData.maxTemperature) * 10)
        : 0;

      const tx = await contract.createShipment(
        formData.recipient,
        formData.product,
        formData.origin,
        formData.destination,
        formData.requiresColdChain,
        estimatedDeliveryTimestamp,
        minTemp,
        maxTemp
      );

      await tx.wait();
      
      toast.success('Shipment created successfully!');
      router.push('/');
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast.error(`Failed to create shipment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-muted">Checking registration...</div>
      </div>
    );
  }

  if (!isRegistered) {
    return null; // Will be redirected by ProtectedRoute
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Shipment</h1>
        <p className="text-text-muted">Create a new shipment for tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-foreground mb-1">
              Recipient Address *
            </label>
            <input
              type="text"
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="0x..."
            />
          </div>

          <div>
            <label htmlFor="product" className="block text-sm font-medium text-foreground mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="product"
              name="product"
              value={formData.product}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">
                Origin *
              </label>
              <input
                type="text"
                id="origin"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Origin location"
              />
            </div>

            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">
                Destination *
              </label>
              <input
                type="text"
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Destination location"
              />
            </div>
          </div>

          <div>
            <label htmlFor="estimatedDeliveryHours" className="block text-sm font-medium text-foreground mb-1">
              Estimated Delivery (hours) *
            </label>
            <input
              type="number"
              id="estimatedDeliveryHours"
              name="estimatedDeliveryHours"
              value={formData.estimatedDeliveryHours || ''}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., 72"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresColdChain"
              name="requiresColdChain"
              checked={formData.requiresColdChain}
              onChange={handleChange}
              className="w-4 h-4 text-secondary border-border rounded focus:ring-secondary"
            />
            <label htmlFor="requiresColdChain" className="ml-2 text-sm font-medium text-foreground">
              Requires Cold Chain (Temperature Controlled)
            </label>
          </div>

          {formData.requiresColdChain && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-accent rounded-md">
              <div>
                <label htmlFor="minTemperature" className="block text-sm font-medium text-foreground mb-1">
                  Min Temperature (°C) *
                </label>
                <input
                  type="number"
                  id="minTemperature"
                  name="minTemperature"
                  value={formData.minTemperature}
                  onChange={handleChange}
                  required={formData.requiresColdChain}
                  step="0.1"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="e.g., 2.0"
                />
              </div>

              <div>
                <label htmlFor="maxTemperature" className="block text-sm font-medium text-foreground mb-1">
                  Max Temperature (°C) *
                </label>
                <input
                  type="number"
                  id="maxTemperature"
                  name="maxTemperature"
                  value={formData.maxTemperature}
                  onChange={handleChange}
                  required={formData.requiresColdChain}
                  step="0.1"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="e.g., 4.0"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creating...' : 'Create Shipment'}
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

