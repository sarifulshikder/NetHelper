import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin-sidebar';
import AdminHeader from '@/components/admin-header';

// Auth check for admin routes
export default function AdminLayout({ children }: { children: ReactNode }) {
  // In a real app, you would check the JWT token here
  // For now, we'll assume authentication is handled by the API client
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AdminHeader />
        
        {/* Page content */}
        <main className="flex-1 p-6 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
