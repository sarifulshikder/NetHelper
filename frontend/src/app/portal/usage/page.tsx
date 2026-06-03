'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UsageData {
  date: string;
  download: number;
  upload: number;
}

interface UsageStats {
  totalDownload: number;
  totalUpload: number;
  averageDownload: number;
  averageUpload: number;
}

export default function PortalUsagePage() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/portal/usage?range=${timeRange}`);
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        const data = await response.json();
        setUsageData(data.usage);
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 p-4 bg-red-50 rounded">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Usage Statistics</h1>

      {/* Time Range Selector */}
      <div className="mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Last 7 Days</SelectItem>
            <SelectItem value="monthly">Last 30 Days</SelectItem>
            <SelectItem value="quarterly">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Usage Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bandwidth Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={usageData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="download"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="Download"
                />
                <Area
                  type="monotone"
                  dataKey="upload"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  name="Upload"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Download</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats ? `${(stats.totalDownload / 1024).toFixed(2)} GB` : '0 GB'}
            </div>
            <p className="text-sm text-gray-500 mt-2">Total data downloaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats ? `${(stats.totalUpload / 1024).toFixed(2)} GB` : '0 GB'}
            </div>
            <p className="text-sm text-gray-500 mt-2">Total data uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Download</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats ? `${stats.averageDownload.toFixed(2)} Mbps` : '0 Mbps'}
            </div>
            <p className="text-sm text-gray-500 mt-2">Average download speed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats ? `${stats.averageUpload.toFixed(2)} Mbps` : '0 Mbps'}
            </div>
            <p className="text-sm text-gray-500 mt-2">Average upload speed</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Monitor your bandwidth usage to optimize your internet experience.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>Schedule large downloads during off-peak hours</li>
              <li>Use Wi-Fi calling for better voice quality</li>
              <li>Enable QoS settings on your router for priority traffic</li>
              <li>Regularly check for firmware updates on your devices</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
