'use client';

import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getCurrentAccount, formatAddress } from '@/lib/web3';

export default function MetaMaskButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Only check for connection if user explicitly connected in this session
    // This prevents auto-connect on page refresh
    checkConnectionIfConnected();
    
    // Listen for account changes (if user switches accounts in MetaMask)
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkConnectionIfConnected = async () => {
    // Only check if we have a session flag that user connected
    const wasConnected = typeof window !== 'undefined' && sessionStorage.getItem('metamask_connected') === 'true';
    if (!wasConnected) return;
    
    try {
      const currentAccount = await getCurrentAccount();
      setAccount(currentAccount);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      // Clear session storage if user disconnected in MetaMask
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('metamask_connected');
      }
    } else {
      setAccount(accounts[0]);
      // Ensure session storage is set if account changed
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('metamask_connected', 'true');
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error: any) {
      alert(`Failed to connect: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setAccount(null);
    // Clear session storage to prevent auto-connect on refresh
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('metamask_connected');
    }
  };

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 bg-accent text-secondary-dark rounded-md text-sm font-medium">
          {formatAddress(account)}
        </span>
        <button
          onClick={handleDisconnect}
          className="px-4 py-1.5 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="px-4 py-1.5 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
    >
      {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  );
}

