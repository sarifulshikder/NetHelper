'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ChurnPrediction {
  id: string;
  customerId: string;
  customerName: string;
  healthScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastPaymentDate: string;
  openTickets: number;
  signalQuality: string;
}

interface TelemetryAnomaly {
  id: string;
  customerId: string;
  customerName: string;
  anomalyType: string;
  detectedAt: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

interface AnomalyDataPoint {
  date: string;
  anomalies: number;
}

export default function AIAnalyticsPage() {
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [anomalies, setAnomalies] = useState<TelemetryAnomaly[]>([]);
  const [anomalyChartData, setAnomalyChartData] = useState<AnomalyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch churn predictions
        const churnResponse = await fetch('/api/ai/churn-predictions');
        if (!churnResponse.ok) {
          throw new Error('Failed to fetch churn predictions');
        }
        const churnData = await churnResponse.json();
        setChurnPredictions(churnData);

        // Fetch telemetry anomalies
        const anomalyResponse = await fetch('/api/ai/network/anomalies');
        if (!anomalyResponse.ok) {
          throw new Error('Failed to fetch telemetry anomalies');
        }
        const anomalyData = await anomalyResponse.json();
        setAnomalies(anomalyData.anomalies);
        setAnomalyChartData(anomalyData.chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge variant="secondary">{riskLevel}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analytics</CardTitle>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Analytics Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Customers</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {churnPredictions.filter(c => c.riskLevel === 'HIGH').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Customers at high risk of churning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {churnPredictions.filter(c => c.riskLevel === 'MEDIUM').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Customers needing attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {anomalies.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Current telemetry anomalies</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Predictions Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Churn Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          {churnPredictions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No churn predictions available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Open Tickets</TableHead>
                  <TableHead>Signal Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnPredictions.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell className="font-medium">{prediction.customerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${prediction.healthScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{prediction.healthScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRiskBadge(prediction.riskLevel)}</TableCell>
                    <TableCell>{new Date(prediction.lastPaymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{prediction.openTickets}</TableCell>
                    <TableCell>{prediction.signalQuality}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Detection Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Telemetry Anomaly Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={anomalyChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="anomalies"
                  stroke="#ef4444"
                  fill="#fecaca"
                  name="Anomalies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Anomalies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Telemetry Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No anomalies detected
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Anomaly Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Detected At</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anomalies.map((anomaly) => (
                  <TableRow key={anomaly.id}>
                    <TableCell className="font-medium">{anomaly.customerName}</TableCell>
                    <TableCell>{anomaly.anomalyType}</TableCell>
                    <TableCell>{getSeverityBadge(anomaly.severity)}</TableCell>
                    <TableCell>{new Date(anomaly.detectedAt).toLocaleString()}</TableCell>
                    <TableCell>{anomaly.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Our AI-driven analytics help you proactively manage customer retention and network health.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>Churn predictions are based on payment history, support tickets, and signal quality</li>
              <li>Telemetry anomalies are detected using statistical analysis of usage patterns</li>
              <li>Take proactive measures to retain at-risk customers and resolve network issues</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
