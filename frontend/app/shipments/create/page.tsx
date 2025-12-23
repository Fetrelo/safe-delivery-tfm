'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { ActorRole } from '@/lib/contract';

export default function CreateShipment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    product: '',
    origin: '',
    destination: '',
    requiresColdChain: false,
    minTemperature: '',
    maxTemperature: '',
    estimatedDeliveryDays: '',
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
      
      // Calculate estimated delivery timestamp
      const estimatedDeliveryDays = parseInt(formData.estimatedDeliveryDays);
      const estimatedDeliveryTimestamp = Math.floor(Date.now() / 1000) + (estimatedDeliveryDays * 24 * 60 * 60);
      
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
      
      alert('Shipment created successfully!');
      router.push('/');
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      alert(`Failed to create shipment: ${error.message}`);
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
            <label htmlFor="estimatedDeliveryDays" className="block text-sm font-medium text-foreground mb-1">
              Estimated Delivery (days) *
            </label>
            <input
              type="number"
              id="estimatedDeliveryDays"
              name="estimatedDeliveryDays"
              value={formData.estimatedDeliveryDays}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., 3"
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

