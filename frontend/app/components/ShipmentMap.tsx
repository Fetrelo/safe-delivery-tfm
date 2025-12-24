'use client';

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

