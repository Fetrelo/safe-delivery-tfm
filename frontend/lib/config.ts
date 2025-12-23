// Contract address configuration
// This will be set from environment variable or manually after deployment
export const CONTRACT_ADDRESS = 
  (typeof window !== 'undefined' && (window as any).CONTRACT_ADDRESS) ||
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '';

// Update contract address (can be called after deployment)
export function setContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    (window as any).CONTRACT_ADDRESS = address;
  }
}

