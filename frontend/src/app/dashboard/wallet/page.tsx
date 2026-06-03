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
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowUp, ArrowDown, Ticket, CreditCard } from 'lucide-react';

interface Transaction {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch wallet transactions and balance from API
  useEffect(() => {
    async function fetchWalletData() {
      try {
        setIsLoading(true);
        
        // Fetch transactions
        const transactionsResponse = await apiClient.get('/wallet/transactions');
        setTransactions(transactionsResponse.data);
        
        // Fetch wallet balance
        const balanceResponse = await apiClient.get('/wallet/balance');
        setWalletBalance(balanceResponse.data.balance || 0);
        
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
        toast.error("An error occurred"
          
          
          
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchWalletData();
  }, [toast]);

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("An error occurred"
        
        
        
      );
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await apiClient.post('/wallet/redeem-voucher', {
        voucherCode: voucherCode.trim(),
      });

      // Update balance and transactions
      setWalletBalance(response.data.newBalance);
      
      // Add the new transaction to the list
      setTransactions([
        {
          id: Date.now().toString(),
          customerName: 'System',
          customerEmail: 'system@nethelper.com',
          amount: response.data.amount,
          type: 'CREDIT',
          description: 'Voucher redemption',
          createdAt: new Date().toISOString(),
        },
        ...transactions,
      ]);

      toast.error("An error occurred"
        
        
      );
      
      setVoucherCode('');
    } catch (error) {
      console.error('Failed to redeem voucher:', error);
      toast.error("An error occurred"
        
        
        
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'DEBIT':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Wallet & Transactions</h1>
      </div>

      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-3xl font-bold text-green-600">${walletBalance.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ArrowUp className="mr-2 h-4 w-4" /> Top Up
              </Button>
              <Button variant="outline" size="sm">
                <ArrowDown className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Redemption Card */}
      <Card>
        <CardHeader>
          <CardTitle>Redeem Prepaid Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="voucher-code">Voucher Code</Label>
              <Input
                id="voucher-code"
                placeholder="Enter voucher code (e.g., NH-2024-XXXX)"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <Button
              onClick={handleRedeemVoucher}
              disabled={isProcessing}
            >
              <Ticket className="mr-2 h-4 w-4" /> 
              {isProcessing ? 'Redeeming...' : 'Redeem Voucher'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.type === 'CREDIT' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.customerName}</p>
                          <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No transactions found
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
