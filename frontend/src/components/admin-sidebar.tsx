'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Settings, LayoutDashboard, Package, FileText } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Tenants',
      href: '/admin/tenants',
      icon: Users,
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      name: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: FileText,
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">NetHelper</h1>
        <p className="text-sm text-gray-500">Super Admin Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <p>Logged in as:</p>
          <p className="font-medium text-gray-900">Super Admin</p>
        </div>
      </div>
    </div>
  );
}
