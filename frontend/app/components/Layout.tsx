'use client';

import SideMenu from './SideMenu';
import MetaMaskButton from './MetaMaskButton';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <SideMenu />
      <div className="flex-1 ml-[18%] flex flex-col">
        <header className="bg-white border-b border-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">Safe Delivery Platform</h2>
          <MetaMaskButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

