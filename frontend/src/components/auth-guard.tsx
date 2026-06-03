'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/reset-password'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if current route is public
    const isPublicRoute = publicRoutes.includes(pathname);
    
    if (!isPublicRoute) {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
