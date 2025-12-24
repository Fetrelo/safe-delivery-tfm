'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentAccount, CONTRACT_ADDRESS } from '@/lib/web3';
import { getActor, isActorRegistered, isAdmin } from '@/lib/contract';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkRegistration();
  }, [pathname]);

  const checkRegistration = async () => {
    // Always allow access to register page
    if (pathname === '/actors/register') {
      setChecking(false);
      setIsRegistered(true); // Allow access to register page
      return;
    }

    try {
      setChecking(true);
      
      // Must have contract deployed
      if (!CONTRACT_ADDRESS) {
        setChecking(false);
        setIsRegistered(false);
        router.replace('/actors/register');
        return;
      }

      // Must have MetaMask connected
      const account = await getCurrentAccount();
      if (!account) {
        setChecking(false);
        setIsRegistered(false);
        // Don't redirect if wallet not connected - let user connect first
        return;
      }

      // Check if user is admin (admins have access without registration)
      const adminStatus = await isAdmin(account);
      
      if (adminStatus) {
        // Admin has access to all pages
        setIsRegistered(true);
      } else {
        // Check if user is registered in the contract
        // A user is registered only if: exists, has valid role, is approved, and is active
        const actor = await getActor(account);
        const registered = isActorRegistered(actor);
        setIsRegistered(registered);

        // If not registered and not admin, redirect to register page
        if (!registered) {
          router.replace('/actors/register');
        }
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
      if (pathname !== '/actors/register') {
        router.replace('/actors/register');
      }
    } finally {
      setChecking(false);
    }
  };

  // Always allow register page
  if (pathname === '/actors/register') {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-text-muted">Checking registration...</div>
      </div>
    );
  }

  // If not registered and not on register page, show loading while redirecting
  if (!isRegistered) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-text-muted">Redirecting to registration...</div>
      </div>
    );
  }

  return <>{children}</>;
}

