"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { SmartAccountService } from '@/services/SmartAccountService';
import { useContract } from './ContractContext';

interface SmartAccountContextType {
  smartAccount: SmartAccountService | null;
  isInitialized: boolean;
  smartAccountAddress: string | null;
}

const SmartAccountContext = createContext<SmartAccountContextType>({
  smartAccount: null,
  isInitialized: false,
  smartAccountAddress: null
});

export function SmartAccountProvider({ children }: { children: React.ReactNode }) {
  const [smartAccount, setSmartAccount] = useState<SmartAccountService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
 

  useEffect(() => {
    // if (!provider) return;

    const initSmartAccount = async () => {
      try {
        console.log("hello from sa context!!")
        const service = new SmartAccountService();
        await service.init(); 
        setSmartAccount(service);
        setSmartAccountAddress(service.getAddress());
        setIsInitialized(true);
        console.log("init done")
      } catch (error) {
        console.error('Error initializing smart account:', error);
      }
    };

    initSmartAccount();
  }, []);

  return (
    <SmartAccountContext.Provider value={{ 
      smartAccount, 
      isInitialized,
      smartAccountAddress 
    }}>
      {children}
    </SmartAccountContext.Provider>
  );
}

export const useSmartAccount = () => useContext(SmartAccountContext); 