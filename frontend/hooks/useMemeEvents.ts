import { useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';

export function useMemeEvents(onMemeUpdated: () => void) {
  const { memeForgeCore: contract } = useContract();

  useEffect(() => {
    if (!contract) return;

    const handleMemeRemixed = async (tokenId: number) => {
      onMemeUpdated();
    };

    contract.on("MemeRemixed", handleMemeRemixed);

    return () => {
      contract.off("MemeRemixed", handleMemeRemixed);
    };
  }, [contract, onMemeUpdated]);
} 