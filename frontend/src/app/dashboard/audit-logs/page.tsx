'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertCircle, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';

interface AuditEvent {
  id: string;
  eventType: string;
  ipAddress: string;
  requestPath: string;
  tenantId?: string;
  tenantName?: string;
  createdAt: string;
  details?: string;
}

export default function AuditLogsPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        const response = await fetch('/api/security/audit-logs');
        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }
        const data = await response.json();
        setAuditEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditEvents();
  }, []);

  const filteredEvents = auditEvents.filter(event => {
    // Filter by search term
    const matchesSearch = 
      event.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.requestPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.tenantName && event.tenantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by event type
    const matchesEventType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;

    return matchesSearch && matchesEventType;
  });

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'RATE_LIMIT_EXCEEDED':
        return <Badge variant="destructive">Rate Limit Exceeded</Badge>;
      case 'UNAUTHORIZED_IP':
        return <Badge variant="destructive">Unauthorized IP</Badge>;
      case 'BRUTE_FORCE_ATTEMPT':
        return <Badge variant="destructive">Brute Force</Badge>;
      case 'INVALID_SIGNATURE':
        return <Badge variant="destructive">Invalid Signature</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'RATE_LIMIT_EXCEEDED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'UNAUTHORIZED_IP':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'BRUTE_FORCE_ATTEMPT':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'INVALID_SIGNATURE':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
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
          <CardTitle>Audit Logs</CardTitle>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Security Audit Logs</h1>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditEvents.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total security events logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditEvents.filter(e => e.eventType === 'RATE_LIMIT_EXCEEDED').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rate limit exceeded events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unauthorized Access</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditEvents.filter(e => e.eventType === 'UNAUTHORIZED_IP' || e.eventType === 'INVALID_SIGNATURE').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Unauthorized access attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by IP, path, or tenant..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                <SelectItem value="RATE_LIMIT_EXCEEDED">Rate Limit Exceeded</SelectItem>
                <SelectItem value="UNAUTHORIZED_IP">Unauthorized IP</SelectItem>
                <SelectItem value="BRUTE_FORCE_ATTEMPT">Brute Force Attempt</SelectItem>
                <SelectItem value="INVALID_SIGNATURE">Invalid Signature</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No security events found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Request Path</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getEventIcon(event.eventType)}
                        {getEventBadge(event.eventType)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{event.ipAddress}</TableCell>
                    <TableCell>{event.tenantName || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">{event.requestPath}</TableCell>
                    <TableCell>{event.details || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Our comprehensive security monitoring helps protect your system.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>Real-time monitoring of all API requests and system access</li>
              <li>Automatic rate limiting to prevent abuse and DDoS attacks</li>
              <li>IP whitelisting for sensitive operations</li>
              <li>Detailed audit trails for compliance and forensic analysis</li>
            </ul>
            <p className="text-sm text-gray-500">
              All events are logged with timestamps and tenant context for complete traceability.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
