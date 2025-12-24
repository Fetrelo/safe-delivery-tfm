'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SideMenu from './SideMenu';
import MetaMaskButton from './MetaMaskButton';
import ProtectedRoute from './ProtectedRoute';
import { getCurrentAccount } from '@/lib/web3';
import { isAdmin as checkIsAdmin } from '@/lib/contract';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleAccountChange = async () => {
      try {
        const account = await getCurrentAccount();
        if (!account) return;

        // Check if user is admin
        const adminStatus = await checkIsAdmin(account);
        
        // If account changed, redirect appropriately
        if (adminStatus) {
          // Admin should go to admin panel (unless already there or on register page)
          if (pathname !== '/admin' && pathname !== '/actors/register') {
            router.push('/admin');
          }
        } else {
          // Regular user should go to dashboard (unless already there or on allowed pages)
          if (pathname !== '/' && pathname !== '/actors/register' && !pathname.startsWith('/shipments/')) {
            router.push('/');
          }
        }
        
        // Trigger refresh of main content
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Error handling account change:', error);
      }
    };

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountChange);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
      };
    }
  }, [router, pathname]);

  // Listen for custom refresh event from SideMenu
  useEffect(() => {
    const handleMenuRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('menuRefresh', handleMenuRefresh);
    
    return () => {
      window.removeEventListener('menuRefresh', handleMenuRefresh);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <SideMenu />
      <div className="flex-1 ml-[18%] flex flex-col">
        <header className="bg-white border-b border-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">Safe Delivery Platform</h2>
          <MetaMaskButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6" key={refreshKey}>
          <ProtectedRoute>{children}</ProtectedRoute>
        </main>
      </div>
    </div>
  );
}

