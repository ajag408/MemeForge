"use client";

import { useContract } from '@/contexts/ContractContext';
import { useState, useEffect } from 'react';

export default function WalletConnect() {
  const { connect, disconnect, signer } = useContract();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    const getAddress = async () => {
      if (signer) {
        const addr = await signer.getAddress();
        setAddress(addr);
        setIsConnected(true);
      } else {
        setAddress('');
        setIsConnected(false);
      }
    };
    getAddress();
  }, [signer]);

  const handleConnect = async () => {
    const signer = await connect();
    if (signer) {
      setIsConnected(true);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsConnected(false);
    setAddress('');
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        }
      });

      return () => {
        if (!window.ethereum) return;
        window.ethereum.removeListener('accountsChanged', () => {});
      };
    }
  }, []);

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
        <button
          onClick={handleConnect}
          disabled={!window.ethereum}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all"
        >
          {!window.ethereum ? 'Install MetaMask' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}