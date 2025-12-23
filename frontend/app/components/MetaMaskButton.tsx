'use client';

import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getCurrentAccount, formatAddress } from '@/lib/web3';

export default function MetaMaskButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkConnection = async () => {
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
    } else {
      setAccount(accounts[0]);
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

