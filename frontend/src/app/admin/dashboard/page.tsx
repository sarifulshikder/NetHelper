import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">12</div>
            <p className="text-sm text-gray-500">Active ISP tenants</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">456</div>
            <p className="text-sm text-gray-500">Across all tenants</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">✓</div>
            <p className="text-sm text-gray-500">All systems operational</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Welcome to the NetHelper Super Admin Panel.</p>
            <p>Use the sidebar to navigate to tenant management, system settings, and monitoring tools.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
