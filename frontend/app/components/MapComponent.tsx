'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Checkpoint } from '@/lib/contract';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MapComponentProps {
  checkpoints: Checkpoint[];
}

function MapBounds({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (checkpoints.length > 0) {
      const bounds = checkpoints
        .filter(cp => Number(cp.latitude) !== 0 && Number(cp.longitude) !== 0)
        .map(cp => [Number(cp.latitude) / 1000000, Number(cp.longitude) / 1000000] as [number, number]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [checkpoints, map]);

  return null;
}

export default function MapComponent({ checkpoints }: MapComponentProps) {
  const validCheckpoints = checkpoints.filter(
    cp => Number(cp.latitude) !== 0 && Number(cp.longitude) !== 0
  );

  const routeCoordinates = validCheckpoints.map(cp => [
    Number(cp.latitude) / 1000000,
    Number(cp.longitude) / 1000000,
  ] as [number, number]);

  if (validCheckpoints.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-text-muted">No location data available</p>
      </div>
    );
  }

  const center: [number, number] = routeCoordinates[0] || [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <MapBounds checkpoints={checkpoints} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {routeCoordinates.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          color="#4f46e5"
          weight={4}
          opacity={0.7}
        />
      )}

      {validCheckpoints.map((checkpoint) => {
        const lat = Number(checkpoint.latitude) / 1000000;
        const lng = Number(checkpoint.longitude) / 1000000;
        
        return (
          <Marker
            key={Number(checkpoint.id)}
            position={[lat, lng]}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{checkpoint.location}</p>
                <p className="text-gray-600">{checkpoint.checkpointType}</p>
                <p className="text-gray-500 text-xs">
                  {new Date(Number(checkpoint.timestamp) * 1000).toLocaleString()}
                </p>
                {checkpoint.notes && (
                  <p className="text-gray-500 text-xs mt-1">{checkpoint.notes}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

