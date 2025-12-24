'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getActor, ActorRole, isActorRegistered, isAdmin as checkIsAdmin } from '@/lib/contract';
import { CONTRACT_ADDRESS, getCurrentAccount } from '@/lib/web3';

export default function SideMenu() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<ActorRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, [pathname]);

  // Also check when window gains focus (user might have registered in another tab)
  useEffect(() => {
    const handleFocus = () => {
      checkUserRole();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const checkUserRole = async () => {
    try {
      setIsChecking(true);
      if (!CONTRACT_ADDRESS) {
        setIsChecking(false);
        setIsRegistered(false);
        return; // Contract not deployed yet
      }
      
      const account = await getCurrentAccount();
      if (!account) {
        setIsChecking(false);
        setIsRegistered(false);
        return; // MetaMask not connected
      }

      // Check if user is registered in the contract
      // A user is registered only if: exists, has valid role, is approved, and is active
      const actor = await getActor(account);
      const registered = isActorRegistered(actor);
      setIsRegistered(registered);
      
      if (registered) {
        setUserRole(actor.role);
      } else {
        // User is not registered (only MetaMask connected)
        setUserRole(null);
      }

      // Check if user is admin (separate from actor registration)
      const adminStatus = await checkIsAdmin(account);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsRegistered(false);
      setUserRole(null);
    } finally {
      setIsChecking(false);
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/shipments/create', label: 'Create Shipment', icon: '➕', roles: [ActorRole.Sender] },
    { href: '/shipments/active', label: 'Active Shipments', icon: '📦' },
    { href: '/shipments/completed', label: 'Completed/Cancelled', icon: '✅' },
    { href: '/actors/register', label: 'Register account', icon: '👤' },
    { href: '/admin', label: 'Admin Panel', icon: '⚙️', adminOnly: true },
  ];

  const filteredItems = menuItems.filter((item) => {
    // If checking, show nothing (or loading state)
    if (isChecking) {
      return false;
    }
    
    // Admins see all menu items (except register if they're also registered as actor)
    if (isAdmin) {
      if (item.href === '/actors/register' && isRegistered) return false;
      return true;
    }
    
    // If user is not registered, only show "Register account"
    if (!isRegistered) {
      return item.href === '/actors/register';
    }
    
    // Normal filtering for registered users (non-admins)
    if (item.adminOnly) return false;
    if (item.roles && userRole && !item.roles.includes(userRole)) return false;
    return true;
  });

  return (
    <div className="w-[18%] min-w-[200px] bg-white border-r border-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-secondary">Safe Delivery</h1>
        <p className="text-sm text-text-muted mt-1">Logistics Platform</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4">
        {isChecking ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-text-muted">Loading...</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-secondary text-white'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}

