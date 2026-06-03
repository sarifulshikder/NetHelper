'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Edit, Trash2, Clock, AlertTriangle, CheckCircle, User } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CORPORATE_PREMIUM';
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export default function TicketsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CORPORATE_PREMIUM'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');

  // Fetch tickets from API
  useEffect(() => {
    async function fetchTickets() {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/tickets');
        setTickets(response.data);
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
  }, [toast]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'CORPORATE_PREMIUM':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CORPORATE_PREMIUM':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Helpdesk Ticketing</h1>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tickets..."
              className="pl-10 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => router.push('/dashboard/tickets/create')}>
            <Plus className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Priority:</span>
              <div className="flex gap-2">
                <Button
                  variant={priorityFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('ALL')}
                >
                  All
                </Button>
                <Button
                  variant={priorityFilter === 'LOW' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('LOW')}
                >
                  Low
                </Button>
                <Button
                  variant={priorityFilter === 'MEDIUM' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('MEDIUM')}
                >
                  Medium
                </Button>
                <Button
                  variant={priorityFilter === 'HIGH' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('HIGH')}
                >
                  High
                </Button>
                <Button
                  variant={priorityFilter === 'CORPORATE_PREMIUM' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('CORPORATE_PREMIUM')}
                >
                  Corporate
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('ALL')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('OPEN')}
                >
                  Open
                </Button>
                <Button
                  variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('IN_PROGRESS')}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === 'RESOLVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('RESOLVED')}
                >
                  Resolved
                </Button>
                <Button
                  variant={statusFilter === 'CLOSED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('CLOSED')}
                >
                  Closed
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)} className="cursor-pointer">
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.customerName}</p>
                          <p className="text-sm text-gray-500">{ticket.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(ticket.priority)}
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{ticket.category}</TableCell>
                      <TableCell>{ticket.assignedTo || 'Unassigned'}</TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/tickets/${ticket.id}`);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
