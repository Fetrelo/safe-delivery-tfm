import { ethers } from 'ethers';
import CONTRACT_ABI_JSON from './contract-abi.json';

export const CONTRACT_ABI = CONTRACT_ABI_JSON as const;

// Local Anvil network configuration
export const NETWORK_CONFIG = {
  chainId: 31337, // Anvil default chain ID
  name: 'Anvil Local',
  rpcUrl: 'http://127.0.0.1:8545',
};

import { CONTRACT_ADDRESS as CONFIG_ADDRESS, setContractAddress as setConfigAddress } from './config';

// Contract address - will be set after deployment
export let CONTRACT_ADDRESS = CONFIG_ADDRESS;

export function setContractAddress(address: string) {
  CONTRACT_ADDRESS = address;
  setConfigAddress(address);
}

// Get provider from MetaMask
export async function getProvider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

// Get signer from MetaMask
export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const provider = await getProvider();
  if (provider) {
    return await provider.getSigner();
  }
  return null;
}

// Get contract instance
export async function getContract() {
  const signer = await getSigner();
  if (!signer || !CONTRACT_ADDRESS) {
    throw new Error('Contract not initialized or user not connected');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// Connect to MetaMask
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  
  // Check if we're on the correct network
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
    // Try to switch to Anvil network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
              chainName: NETWORK_CONFIG.name,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  return accounts[0];
}

// Disconnect wallet (just clear local state)
export function disconnectWallet() {
  // MetaMask doesn't have a disconnect method, so we just clear local state
  // The actual connection remains but we stop tracking it
  return true;
}

// Get current account
export async function getCurrentAccount(): Promise<string | null> {
  const provider = await getProvider();
  if (!provider) return null;
  
  const accounts = await provider.listAccounts();
  return accounts.length > 0 ? accounts[0].address : null;
}

// Check if wallet is connected
export async function isWalletConnected(): Promise<boolean> {
  const account = await getCurrentAccount();
  return account !== null;
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Declare window.ethereum type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

