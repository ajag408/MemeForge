"use client";

import { createContext, useContext, useState } from 'react';
import { SmartAccountService } from '@/services/SmartAccountService';

interface SmartAccountContextType {
  smartAccount: SmartAccountService | null;
  isInitialized: boolean;
  smartAccountAddress: string | null;
  initializeSmartAccount: () => Promise<void>;
  logout: () => void;
}

const SmartAccountContext = createContext<SmartAccountContextType>({
  smartAccount: null,
  isInitialized: false,
  smartAccountAddress: null,
  initializeSmartAccount: async () => {},
  logout: () => {},
});

export function SmartAccountProvider({ children }: { children: React.ReactNode }) {
  const [smartAccount, setSmartAccount] = useState<SmartAccountService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);

  const initializeSmartAccount = async () => {
    try {
      const service = new SmartAccountService();
      await service.init();
      setSmartAccount(service);
      setSmartAccountAddress(service.getAddress());
      setIsInitialized(true);
      
      // Store the account info in localStorage
      localStorage.setItem('smartAccountAddress', service.getAddress());
    } catch (error) {
      console.error('Error initializing smart account:', error);
      throw error;
    }
  };

  const logout = () => {
    if (smartAccount) {
      smartAccount.logout();
    }
    setSmartAccount(null);
    setSmartAccountAddress(null);
    setIsInitialized(false);
    localStorage.removeItem('smartAccountAddress');
  };


  return (
    <SmartAccountContext.Provider value={{ 
      smartAccount, 
      isInitialized,
      smartAccountAddress,
      initializeSmartAccount,
      logout
    }}>
      {children}
    </SmartAccountContext.Provider>
  );
}

export const useSmartAccount = () => {
  const context = useContext(SmartAccountContext);
  if (!context) {
    throw new Error('useSmartAccount must be used within a SmartAccountProvider');
  }
  return context;
}; 