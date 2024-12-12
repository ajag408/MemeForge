"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { isClient } from '@/utils/isClient';

export default function WalletConnect() {
  const { connect, disconnect, signer } = useContract();
  const { initializeSmartAccount, smartAccountAddress, logout } = useSmartAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getAddress = async () => {
      if (signer) {
        const addr = await signer.getAddress();
        setAddress(addr);
        setIsConnected(true);
      } else if (smartAccountAddress) {
        setAddress(smartAccountAddress);
        setIsConnected(true);
      } else {
        setAddress('');
        setIsConnected(false);
      }
    };
    getAddress();
  }, [signer, smartAccountAddress]);

  const handleConnect = async () => {
    const signer = await connect();
    if (signer) {
      setIsConnected(true);
    }
  };

  const handleSmartAccountConnect = async () => {
    setIsLoading(true);
    try {
      await initializeSmartAccount();
      setIsConnected(true);
    } catch (error) {
      console.error('Error creating smart account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
    setIsConnected(false);
    setAddress('');
    localStorage.removeItem('smartAccountAddress');
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {address ? (
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
          <button 
            onClick={handleDisconnect}
            className="ml-2 text-sm bg-white/20 hover:bg-white/30 rounded px-2 py-1"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleSmartAccountConnect}
            disabled={isLoading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-lg shadow-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Creating...' : 'Use Smart Account'}
          </button>
          <button
            onClick={handleConnect}
            disabled={!isClient || !window.ethereum}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all"
          >
            {!isClient || !window.ethereum ? 'Install MetaMask' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}