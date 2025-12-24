'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getContract, getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { ShipmentStatus, ActorRole, Checkpoint } from '@/lib/contract';

// Component to handle map clicks (must be inside MapContainer)
// This needs to be a separate component to use hooks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  if (typeof window === 'undefined') return null;
  
  // Import useMapEvents dynamically on client side
  const { useMapEvents } = require('react-leaflet');
  useMapEvents({
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

// Component to update map center programmatically
function MapCenterUpdater({ center }: { center: [number, number] }) {
  if (typeof window === 'undefined') return null;
  
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer })), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer })), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Marker })), { ssr: false });

interface CheckpointModalProps {
  shipmentId: number;
  currentStatus: ShipmentStatus;
  userRole: ActorRole;
  checkpoints?: Checkpoint[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckpointModal({
  shipmentId,
  currentStatus,
  userRole,
  checkpoints = [],
  onClose,
  onSuccess,
}: CheckpointModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.66937, -103.35147]); // Default to Guadalajara
  const [formData, setFormData] = useState({
    locationName: '',
    checkpointType: '',
    notes: '',
    temperature: '',
    latitude: '',
    longitude: '',
    hasDamage: false,
  });

  useEffect(() => {
    // Determine checkpoint type based on role and status
    let checkpointType = 'Report';
    
    if (userRole === ActorRole.Carrier) {
      if (currentStatus === ShipmentStatus.Created) {
        checkpointType = 'Pickup';
      } else if (currentStatus === ShipmentStatus.AtHub) {
        checkpointType = 'Pickup';
      } else if (currentStatus === ShipmentStatus.InTransit) {
        checkpointType = 'Transit';
      }
    } else if (userRole === ActorRole.Hub) {
      if (currentStatus === ShipmentStatus.InTransit) {
        checkpointType = 'Hub';
      } else if (currentStatus === ShipmentStatus.OutForDelivery) {
        checkpointType = 'Hub';
      }
    } else if (userRole === ActorRole.Recipient) {
      if (currentStatus === ShipmentStatus.OutForDelivery) {
        checkpointType = 'Delivery';
      }
    } else if (userRole === ActorRole.Sensor) {
      checkpointType = 'Report';
    } else if (userRole === ActorRole.Sender) {
      checkpointType = 'Report';
    }

    setFormData(prev => ({ ...prev, checkpointType }));
  }, [userRole, currentStatus]);


  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng]);
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  };

  // Set map center to last checkpoint coordinates, or user location, or default
  useEffect(() => {
    let isMounted = true;
    
    // First, try to use the last checkpoint's coordinates
    if (checkpoints && checkpoints.length > 0) {
      // Find the last checkpoint with valid coordinates (not 0,0)
      const validCheckpoints = checkpoints.filter(
        cp => Number(cp.latitude) !== 0 && Number(cp.longitude) !== 0
      );
      
      if (validCheckpoints.length > 0) {
        // Get the last checkpoint (checkpoints are typically in chronological order)
        const lastCheckpoint = validCheckpoints[validCheckpoints.length - 1];
        const lat = Number(lastCheckpoint.latitude) / 1000000; // Convert from contract format
        const lng = Number(lastCheckpoint.longitude) / 1000000;
        
        if (isMounted) {
          setMapCenter([lat, lng]);
          // Also set as selected location and form data
          setSelectedLocation([lat, lng]);
          setFormData(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString(),
          }));
        }
        return; // Don't try geolocation if we have checkpoint coordinates
      }
    }
    
    // If no checkpoint coordinates, try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            setMapCenter([position.coords.latitude, position.coords.longitude]);
          }
        },
        () => {
          // If geolocation fails, use default center (GDL coordinates) already set in initial state
          if (isMounted) {
            console.log('Using default map center');
          }
        }
      );
    }
    
    return () => {
      isMounted = false;
    };
  }, [checkpoints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!CONTRACT_ADDRESS) {
      alert('Contract not deployed');
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
      
      // Convert coordinates to contract format (multiply by 10^6)
      const latitude = Math.floor(parseFloat(formData.latitude) * 1000000);
      const longitude = Math.floor(parseFloat(formData.longitude) * 1000000);
      
      // Convert temperature (multiply by 10 for contract)
      const temperature = formData.temperature 
        ? Math.floor(parseFloat(formData.temperature) * 10)
        : 0;

      const tx = await contract.recordCheckpoint(
        shipmentId,
        formData.locationName,
        formData.checkpointType,
        formData.notes,
        temperature,
        latitude,
        longitude,
        formData.hasDamage
      );

      await tx.wait();
      
      alert('Checkpoint recorded successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error recording checkpoint:', error);
      alert(`Failed to record checkpoint: ${error.message}`);
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

  const canChangeStatus = formData.checkpointType !== 'Report' && formData.checkpointType !== 'Transit';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Record Checkpoint</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-foreground text-2xl"
          >
            ×
          </button>
        </div>

        {canChangeStatus && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This checkpoint will update the shipment status to the next stage.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Checkpoint Type
            </label>
            <input
              type="text"
              value={formData.checkpointType}
              disabled
              className="w-full px-3 py-2 border border-border rounded-md bg-gray-50 text-text-muted"
            />
            <p className="text-xs text-text-muted mt-1">
              {formData.checkpointType === 'Report' 
                ? 'This checkpoint will not change the shipment status'
                : 'This checkpoint will update the shipment status'}
            </p>
          </div>

          <div>
            <label htmlFor="locationName" className="block text-sm font-medium text-foreground mb-1">
              Location Name *
            </label>
            <input
              type="text"
              id="locationName"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., Warehouse A, Distribution Center"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Location Coordinates *
            </label>
            <p className="text-xs text-text-muted mb-2">
              Click on the map to select a location
            </p>
            <div className="w-full h-64 rounded-lg overflow-hidden border border-border mb-2">
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapCenterUpdater center={mapCenter} />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {selectedLocation && (
                    <Marker position={selectedLocation} />
                  )}
                </MapContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-foreground mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                  step="any"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="e.g., 40.7128"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-foreground mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                  step="any"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="e.g., -74.0060"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-foreground mb-1">
              Temperature (°C)
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              step="0.1"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="e.g., 3.5"
            />
            <p className="text-xs text-text-muted mt-1">
              Leave empty if not applicable
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Additional information about this checkpoint"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasDamage"
              name="hasDamage"
              checked={formData.hasDamage}
              onChange={handleChange}
              className="w-4 h-4 text-secondary border-border rounded focus:ring-secondary"
            />
            <label htmlFor="hasDamage" className="ml-2 text-sm font-medium text-foreground">
              Report damage at this checkpoint
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Recording...' : 'Record Checkpoint'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

