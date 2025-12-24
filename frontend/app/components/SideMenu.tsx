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
  const [hasSubmittedRegistration, setHasSubmittedRegistration] = useState(false);
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
        setHasSubmittedRegistration(false);
        return; // Contract not deployed yet
      }
      
      const account = await getCurrentAccount();
      if (!account) {
        setIsChecking(false);
        setIsRegistered(false);
        setHasSubmittedRegistration(false);
        return; // MetaMask not connected
      }

      // Check if user has submitted a registration request (exists in contract, regardless of approval status)
      const actor = await getActor(account);
      const hasSubmitted = actor.actorAddress !== '0x0000000000000000000000000000000000000000';
      setHasSubmittedRegistration(hasSubmitted);
      
      // A user is fully registered only if: exists, has valid role, is approved, and is active
      const registered = isActorRegistered(actor);
      setIsRegistered(registered);
      
      if (registered) {
        // Ensure role is cast to ActorRole enum
        setUserRole(actor.role as ActorRole);
      } else {
        // User is not registered (only MetaMask connected)
        setUserRole(null);
      }

      // Check if user is admin (separate from actor registration)
      const adminStatus = await checkIsAdmin(account);
      setIsAdmin(adminStatus);
      
      // Trigger refresh of main content when menu state changes
      window.dispatchEvent(new CustomEvent('menuRefresh'));
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsRegistered(false);
      setHasSubmittedRegistration(false);
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
    
    // Admins see all menu items (except register account and create shipment)
    if (isAdmin) {
      if (item.href === '/actors/register') return false;
      if (item.href === '/shipments/create') return false;
      return true;
    }
    
    // If user has not submitted registration, only show "Register account"
    if (!hasSubmittedRegistration) {
      return item.href === '/actors/register';
    }
    
    // If user has submitted registration, hide "Register account" (they've already submitted)
    if (item.href === '/actors/register') {
      return false;
    }
    
    // Normal filtering for registered users (non-admins)
    // Note: ProtectedRoute will handle blocking access if not approved
    if (item.adminOnly) return false;
    
    // Role-based filtering: if item requires specific roles, user must have one of those roles
    if (item.roles) {
      // If user doesn't have a role yet, hide the item
      if (userRole === null || userRole === undefined) return false;
      // If user's role is not in the required roles, hide the item
      // Compare both enum values and numeric values to handle type differences
      const userRoleValue = Number(userRole);
      const hasMatchingRole = item.roles.some(role => Number(role) === userRoleValue);
      if (!hasMatchingRole) return false;
    }
    
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

