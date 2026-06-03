'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  MessageSquare,
  Bot,
  Lightbulb,
  Send,
  ArrowLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Ticket {
  id: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CORPORATE_PREMIUM';
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  slaDue?: string;
}

interface AIAnalysis {
  suggestedCategory: string;
  sentiment: string;
  confidence: number;
  resolutionScript: string;
  customerContext: string;
  networkTopologyNotes: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const ticketId = params.id as string;

  // Fetch ticket details and staff members
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch ticket details
        const ticketResponse = await apiClient.get(`/tickets/${ticketId}`);
        setTicket(ticketResponse.data);
        
        // Fetch available staff members
        const staffResponse = await apiClient.get('/users/staff');
        setStaffMembers(staffResponse.data);
        
      } catch (error) {
        console.error('Failed to fetch ticket data:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [ticketId, toast]);

  const handleAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const response = await apiClient.post(`/ai/tickets/${ticketId}/analyze`);
      setAiAnalysis(response.data);
      
      toast.error("An error occurred"
        
        
      );
      
    } catch (error) {
      console.error('Failed to analyze ticket:', error);
      toast.error("An error occurred"
        
        
        
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTicket = async (field: string, value: string) => {
    try {
      setIsUpdating(true);
      
      await apiClient.patch(`/tickets/${ticketId}`, {
        [field]: value,
      });
      
      // Update local state
      if (ticket) {
        setTicket({ ...ticket, [field]: value });
      }
      
      toast.error("An error occurred"
        
        
      );
      
    } catch (error) {
      console.error('Failed to update ticket:', error);
      toast.error("An error occurred"
        
        
        
      );
    } finally {
      setIsUpdating(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Ticket #{ticket.id}</h1>
        <div></div> {/* Spacer */}
      </div>

      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPriorityIcon(ticket.priority)}
            <span>{ticket.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{ticket.customerName}</p>
              <p className="text-sm text-gray-500">{ticket.customerEmail}</p>
              <p className="text-sm text-gray-500">{ticket.customerPhone}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(ticket.priority)}`}>
                {ticket.priority.replace('_', ' ')}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Select
                value={ticket.status}
                onValueChange={(value) => handleUpdateTicket('status', value)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-[180px]">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium">{ticket.category}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Assigned To</p>
              <Select
                value={ticket.assignedTo || ''}
                onValueChange={(value) => handleUpdateTicket('assignedTo', value)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-[180px]">
                  <span>{ticket.assignedTo || 'Unassigned'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Updated</p>
              <p className="font-medium">{new Date(ticket.updatedAt).toLocaleString()}</p>
            </div>

            {ticket.slaDue && (
              <div>
                <p className="text-sm text-gray-500">SLA Due</p>
                <p className="font-medium">{new Date(ticket.slaDue).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p>{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Copilot Analysis */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Copilot Insights
          </CardTitle>
          <Button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || !!aiAnalysis}
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                {aiAnalysis ? 'Re-analyze' : 'Analyze Ticket'}
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {aiAnalysis ? (
            <Tabs defaultValue="resolution" className="space-y-4">
              <TabsList>
                <TabsTrigger value="resolution">Resolution Script</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="context">Customer Context</TabsTrigger>
              </TabsList>

              <TabsContent value="resolution">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ReactMarkdown>
                      {aiAnalysis.resolutionScript}
                    </ReactMarkdown>
                  </div>
                  <Button className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Send Resolution to Technician
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="analysis">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Suggested Category</p>
                      <p className="font-medium">{aiAnalysis.suggestedCategory}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sentiment</p>
                      <p className="font-medium capitalize">{aiAnalysis.sentiment}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Confidence</p>
                      <p className="font-medium">{(aiAnalysis.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="context">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Customer Context</p>
                    <p className="font-medium">{aiAnalysis.customerContext}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Network Topology Notes</p>
                    <p className="font-medium">{aiAnalysis.networkTopologyNotes}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="mx-auto h-12 w-12 mb-4" />
              <p>Click "Analyze Ticket" to get AI-powered insights and resolution suggestions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket History */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ticket created by {ticket.customerName}</p>
                <p className="text-sm">{ticket.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {ticket.status !== 'OPEN' && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status changed to {ticket.status.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
