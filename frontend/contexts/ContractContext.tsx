"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import MemeForgeContract from '../contracts/MemeForge.json';
import { useSmartAccount } from '@/contexts/SmartAccountContext';

const REQUIRED_CHAIN_ID = 11011;

interface ContractContextType {
  contract: ethers.Contract | null;
  signer: ethers.Signer | null;
  isWrongNetwork: boolean;
  connect: () => Promise<ethers.Signer | null>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  isConnected: boolean;
}

const ContractContext = createContext<ContractContextType | null>(null);

export function ContractProvider({ children }: { children: ReactNode }) {
  const { smartAccount, smartAccountAddress } = useSmartAccount();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const newContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_MEMEFORGE_ADDRESS!,
      MemeForgeContract.abi,
      provider
    );
    setContract(newContract);
  }, []);

  useEffect(() => {
    if (contract && (signer || smartAccount?.signer)) {
        const activeSigner = smartAccount?.signer || signer;
        if (activeSigner) {
            const connectedContract = contract.connect(activeSigner);
            setContract(connectedContract);
        }
    }
  }, [signer, smartAccount]);

  useEffect(() => {
    setIsConnected(!!signer || !!smartAccountAddress);
  }, [signer, smartAccountAddress]);

  const switchNetwork = async () => {
    try {
      if (!window.ethereum) return;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
    }
  };

  const connect = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) return null;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const network = await provider.getNetwork();
      if (network.chainId !== REQUIRED_CHAIN_ID) {
        setIsWrongNetwork(true);
        return null;
      }
      
      setIsWrongNetwork(false);
      const newSigner = provider.getSigner();
      setSigner(newSigner);

      if (contract) {
        const connectedContract = contract.connect(newSigner);
        setContract(connectedContract);
      }

      return newSigner;
    } catch (error) {
      console.error('Error connecting:', error);
      return null;
    }
  };

  const disconnect = () => {
    setSigner(null);
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const newContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MEMEFORGE_ADDRESS!,
        MemeForgeContract.abi,
        provider
      );
      setContract(newContract);
    }
  };

  return (
    <ContractContext.Provider value={{
      contract,
      signer: smartAccount?.signer || signer,
      isWrongNetwork,
      connect,
      disconnect,
      switchNetwork,
      isConnected
    }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContract() {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within a ContractProvider');
  }
  return context;
}