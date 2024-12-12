"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import MemeForgeCore from '../contracts/MemeForgeCore.json';
import MemeForgeGasBack from '../contracts/MemeForgeGasBack.json';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { isClient } from '@/utils/isClient';

const REQUIRED_CHAIN_ID = 11011;

interface ContractContextType {
  memeForgeCore: ethers.Contract | null;
  memeForgeGasBack: ethers.Contract | null;
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
  const [memeForgeCore, setMemeForgeCore] = useState<ethers.Contract | null>(null);
  const [memeForgeGasBack, setMemeForgeGasBack] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isClient ||typeof window === 'undefined' || !window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const core = new ethers.Contract(
      CONTRACT_ADDRESSES.MemeForgeCore,
      MemeForgeCore.abi,
      provider
    );
    
    const gasBack = new ethers.Contract(
      CONTRACT_ADDRESSES.MemeForgeGasBack,
      MemeForgeGasBack.abi,
      provider
    );

    setMemeForgeCore(core);
    setMemeForgeGasBack(gasBack);
  }, []);

  useEffect(() => {
    if ((memeForgeCore || memeForgeGasBack) && (signer || smartAccount?.signer)) {
      const activeSigner = smartAccount?.signer || signer;
      if (activeSigner) {
        if (memeForgeCore) {
          setMemeForgeCore(memeForgeCore.connect(activeSigner));
        }
        if (memeForgeGasBack) {
          setMemeForgeGasBack(memeForgeGasBack.connect(activeSigner));
        }
      }
    }
  }, [signer, smartAccount]);

  useEffect(() => {
    setIsConnected(!!signer || !!smartAccountAddress);
  }, [signer, smartAccountAddress]);

  const switchNetwork = async () => {
    try {
      if (!isClient || !window.ethereum) return;
      
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
      if (!isClient || !window.ethereum) return null;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const network = await provider.getNetwork();
      if (network.chainId !== REQUIRED_CHAIN_ID) {
        setIsWrongNetwork(true);
        await switchNetwork();
        return null;
      }
      
      setIsWrongNetwork(false);
      const signer = provider.getSigner();
      setSigner(signer);
      setIsConnected(true);

      // Update contracts with signer
      setMemeForgeCore(new ethers.Contract(
        CONTRACT_ADDRESSES.MemeForgeCore,
        MemeForgeCore.abi,
        signer
      ));
      
      setMemeForgeGasBack(new ethers.Contract(
        CONTRACT_ADDRESSES.MemeForgeGasBack,
        MemeForgeGasBack.abi,
        signer
      ));

      return signer;
    } catch (error) {
      console.error('Error connecting:', error);
      return null;
    }
  };

  const disconnect = () => {
    setSigner(null);
    setIsConnected(false);
    
    // Reinitialize with provider only
    if (isClient && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setMemeForgeCore(new ethers.Contract(
        CONTRACT_ADDRESSES.MemeForgeCore,
        MemeForgeCore.abi,
        provider
      ));
      
      setMemeForgeGasBack(new ethers.Contract(
        CONTRACT_ADDRESSES.MemeForgeGasBack,
        MemeForgeGasBack.abi,
        provider
      ));
    }
  };

  return (
    <ContractContext.Provider value={{
      memeForgeCore,
      memeForgeGasBack,
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