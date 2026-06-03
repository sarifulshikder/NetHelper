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
import { useToast } from '@/components/ui/use-toast';
import { Clock, CheckCircle, AlertTriangle, MapPin, User, Wrench, Edit } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'WORK_IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  customerAddress: string;
  coordinates: string;
  slaDue: string;
  createdAt: string;
  updatedAt: string;
}

export default function TasksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tasks from API
  useEffect(() => {
    async function fetchTasks() {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/technician/tasks');
        setTasks(response.data);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'EN_ROUTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARRIVED':
        return 'bg-orange-100 text-orange-800';
      case 'WORK_IN_PROGRESS':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
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
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'EN_ROUTE':
        return <MapPin className="h-4 w-4 text-yellow-500" />;
      case 'ARRIVED':
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      case 'WORK_IN_PROGRESS':
        return <Wrench className="h-4 w-4 text-purple-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const calculateSLATimeRemaining = (slaDue: string) => {
    const dueDate = new Date(slaDue);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Overdue';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Field Operations & Tasks</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
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
                  <TableHead>Task</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{task.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.technicianName}</p>
                          <p className="text-sm text-gray-500">{task.technicianEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.customerName}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{task.customerAddress}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(task.priority)}
                          <span className="text-xs font-medium capitalize">{task.priority.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Due</span>
                          <span className={`text-xs font-medium ${new Date(task.slaDue) < new Date() ? 'text-red-500' : 'text-gray-900'}`}>
                            {new Date(task.slaDue).toLocaleString()}
                          </span>
                          <span className={`text-xs ${new Date(task.slaDue) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                            {calculateSLATimeRemaining(task.slaDue)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="truncate">
                          <MapPin className="h-4 w-4 mr-1" />
                          {task.coordinates}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No active tasks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.filter(t => ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'WORK_IN_PROGRESS'].includes(t.status)).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.filter(t => t.status === 'COMPLETED' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${tasks.filter(t => t.status !== 'COMPLETED' && new Date(t.slaDue) < new Date()).length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {tasks.filter(t => t.status !== 'COMPLETED' && new Date(t.slaDue) < new Date()).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
