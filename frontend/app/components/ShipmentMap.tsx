'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Checkpoint } from '@/lib/contract';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-text-muted">Loading map...</p>
    </div>
  )
});
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

interface ShipmentMapProps {
  checkpoints: Checkpoint[];
}

export default function ShipmentMap({ checkpoints }: ShipmentMapProps) {

  const validCheckpoints = checkpoints.filter(
    cp => Number(cp.latitude) !== 0 && Number(cp.longitude) !== 0
  );

  const routeCoordinates = validCheckpoints.map(cp => [
    Number(cp.latitude) / 1000000,
    Number(cp.longitude) / 1000000,
  ] as [number, number]);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-border">
      <MapComponent checkpoints={checkpoints} />
    </div>
  );
}

