'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getActor, ActorRole } from '@/lib/contract';
import { getContract, CONTRACT_ADDRESS, getCurrentAccount } from '@/lib/web3';

export default function SideMenu() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<ActorRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      if (!CONTRACT_ADDRESS) return; // Contract not deployed yet
      
      const account = await getCurrentAccount();
      if (!account) return;

      const actor = await getActor(account);
      if (actor.actorAddress !== '0x0000000000000000000000000000000000000000') {
        setUserRole(actor.role);
      }

      // Check if user is admin (contract deployer)
      const contract = await getContract();
      const adminAddress = await contract.admin();
      setIsAdmin(account.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/shipments/create', label: 'Create Shipment', icon: '➕', roles: [ActorRole.Sender] },
    { href: '/shipments/active', label: 'Active Shipments', icon: '📦' },
    { href: '/shipments/completed', label: 'Completed/Cancelled', icon: '✅' },
    { href: '/actors/register', label: 'Register as Actor', icon: '👤' },
    { href: '/admin', label: 'Admin Panel', icon: '⚙️', adminOnly: true },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
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
      </nav>
    </div>
  );
}

