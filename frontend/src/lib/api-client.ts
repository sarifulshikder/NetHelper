import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  withCredentials: false,
});

// Tenant interceptor to automatically append X-Tenant-Id header
apiClient.interceptors.request.use(
  (config) => {
    // Try to get tenant from localStorage first (for testing)
    const tenantId = localStorage.getItem('tenantId');
    
    // If no tenant in localStorage, try to extract from subdomain
    if (!tenantId) {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        
        // Handle subdomain pattern like alpha.nethelper.local
        if (parts.length >= 3) {
          const subdomain = parts[0];
          // Map known subdomains to tenant IDs or use subdomain directly
          if (subdomain === 'alpha') {
            config.headers['X-Tenant-Id'] = '1';
          } else if (subdomain === 'apex') {
            config.headers['X-Tenant-Id'] = '2';
          } else {
            config.headers['X-Tenant-Id'] = subdomain;
          }
        }
      }
    } else {
      config.headers['X-Tenant-Id'] = tenantId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error statuses
      if (error.response.status === 401) {
        // Unauthorized - redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('tenantId');
          window.location.href = '/login';
        }
      } else if (error.response.status === 403) {
        // Forbidden - show error message
        console.error('Forbidden: You do not have permission to access this resource');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
