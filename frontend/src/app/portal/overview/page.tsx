'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Wifi, DollarSign } from 'lucide-react';

interface PortalProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  subscriptionPackage: {
    name: string;
    speed: string;
    price: number;
  };
  currentBalance: number;
  alerts: Array<{
    id: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ERROR';
  }>;
}

export default function PortalOverviewPage() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/portal/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Profile data not available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Account</h1>

      {/* Alerts Section */}
      {profile.alerts.length > 0 && (
        <div className="mb-6 space-y-4">
          {profile.alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'ERROR' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{alert.type.charAt(0) + alert.type.slice(1).toLowerCase()}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {profile.status === 'ACTIVE' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <div className="text-2xl font-bold" style={{ color: profile.status === 'ACTIVE' ? '#10B981' : '#EF4444' }}>
                {profile.status === 'ACTIVE' ? '✓ Active' : '✗ Suspended'}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Your internet service is {profile.status.toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{profile.subscriptionPackage.name}</div>
            <div className="flex items-center mt-2">
              <Wifi className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-lg font-medium">{profile.subscriptionPackage.speed}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">${profile.subscriptionPackage.price}/month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                ${profile.currentBalance.toFixed(2)}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-gray-500">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-gray-500">{profile.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Welcome to your customer portal. View your bills, usage, and support tickets.</p>
            <div className="flex flex-wrap gap-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                View Bills
              </button>
              <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                Check Usage
              </button>
              <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                Open Ticket
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
