'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Network, Home, Cable } from 'lucide-react';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface GISNode {
  id: string;
  type: 'POP' | 'JOINT_BOX' | 'CUSTOMER';
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  capacity?: number;
  customerName?: string;
}

interface FiberCable {
  id: string;
  sourceId: string;
  destinationId: string;
  sourceType: string;
  destinationType: string;
  coordinates: [number, number][];
  status: string;
  length: number;
}

export default function GISPage() {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<GISNode[]>([]);
  const [cables, setCables] = useState<FiberCable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GISNode | null>(null);

  // Default map center (Bangladesh coordinates)
  const defaultCenter: [number, number] = [23.8103, 90.4125];

  // Fetch GIS data from API
  useEffect(() => {
    async function fetchGISData() {
      try {
        setIsLoading(true);
        
        // Fetch nodes (POPs, Joint Boxes, Customers)
        const nodesResponse = await apiClient.get('/gis/nodes');
        setNodes(nodesResponse.data);
        
        // Fetch fiber cables
        const cablesResponse = await apiClient.get('/gis/cables');
        setCables(cablesResponse.data);
        
      } catch (error) {
        console.error('Failed to fetch GIS data:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchGISData();
  }, [toast]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'POP':
        return <Network className="h-6 w-6 text-blue-600" />;
      case 'JOINT_BOX':
        return <Cable className="h-6 w-6 text-green-600" />;
      case 'CUSTOMER':
        return <Home className="h-6 w-6 text-orange-600" />;
      default:
        return <MapPin className="h-6 w-6 text-gray-600" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'POP':
        return 'blue';
      case 'JOINT_BOX':
        return 'green';
      case 'CUSTOMER':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getCableColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'DEGRADED':
        return 'yellow';
      case 'FAILED':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">GIS Fiber Mapping</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Topology Map</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="h-[600px] w-full rounded-lg border">
              <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                {/* Base map layer */}
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Draw fiber cables first (so they appear under markers) */}
                {cables.map((cable) => (
                  <Polyline
                    key={cable.id}
                    positions={cable.coordinates}
                    pathOptions={{ 
                      color: getCableColor(cable.status), 
                      weight: 3,
                      opacity: 0.7
                    }}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-bold">Fiber Cable</h3>
                        <p>Length: {cable.length.toFixed(2)} km</p>
                        <p>Status: {cable.status}</p>
                        <p>{cable.sourceType} → {cable.destinationType}</p>
                      </div>
                    </Popup>
                  </Polyline>
                ))}

                {/* Draw nodes */}
                {nodes.map((node) => (
                  <Marker
                    key={node.id}
                    position={[node.latitude, node.longitude]}
                    eventHandlers={
                      {
                        click: () => setSelectedNode(node),
                      }
                    }
                  >
                    <Popup>
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          {getNodeIcon(node.type)}
                          {node.name}
                        </h3>
                        <p>Type: {node.type.replace('_', ' ')}</p>
                        {node.type === 'POP' && (
                          <p>Capacity: {node.capacity} connections</p>
                        )}
                        {node.type === 'CUSTOMER' && (
                          <p>Customer: {node.customerName}</p>
                        )}
                        <p>Status: {node.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node details panel */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-${getNodeColor(selectedNode.type)}-100`}>
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedNode.name}</h2>
                  <p className="text-gray-500 capitalize">{selectedNode.type.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Latitude</p>
                  <p className="font-medium">{selectedNode.latitude}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Longitude</p>
                  <p className="font-medium">{selectedNode.longitude}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedNode.status}</p>
                </div>
                {selectedNode.type === 'POP' && (
                  <div>
                    <p className="text-sm text-gray-500">Capacity</p>
                    <p className="font-medium">{selectedNode.capacity} connections</p>
                  </div>
                )}
                {selectedNode.type === 'CUSTOMER' && (
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{selectedNode.customerName}</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setSelectedNode(null)}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
