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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Invoice {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  tax: number;
  total: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
  packageName: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch invoices from API
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/billing/invoices');
        setInvoices(response.data);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoices();
  }, [toast]);

  const handleProcessPayment = async (invoiceId: string) => {
    try {
      const response = await apiClient.post(`/billing/invoices/${invoiceId}/pay`, {
        paymentMethod: 'CASH',
        amount: invoices.find(inv => inv.id === invoiceId)?.total || 0,
      },
    );

      // Update the invoice status locally
      setInvoices(invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, status: 'PAID' } : inv
      ));

      toast.error("An error occurred"
        
        
      );
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error("An error occurred"
        
        
        
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'UNPAID':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'PARTIALLY_PAID':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'UNPAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'PARTIALLY_PAID':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = activeTab === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.status.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({invoices.filter(i => i.status === 'PAID').length})</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid ({invoices.filter(i => i.status === 'UNPAID').length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({invoices.filter(i => i.status === 'OVERDUE').length})</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.customerName}</p>
                            <p className="text-sm text-gray-500">{invoice.customerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.packageName}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>${invoice.tax.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invoice.status)}
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                              {invoice.status.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'UNPAID' || invoice.status === 'OVERDUE' ? (
                            <Button
                              size="sm"
                              onClick={() => handleProcessPayment(invoice.id)}
                              disabled={isLoading}
                            >
                              <CreditCard className="mr-2 h-4 w-4" /> 
                              Process Payment
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <CheckCircle className="mr-2 h-4 w-4" /> 
                              Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
