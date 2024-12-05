"use client";

import { useMemeForgeContract } from '@/hooks/useContract';
import { useState, useEffect } from 'react';

export default function WalletConnect() {
  const { isConnected, connect, disconnect, signer } = useMemeForgeContract();
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    const getAddress = async () => {
      if (signer) {
        const addr = await signer.getAddress();
        setAddress(addr);
      }
    };
    getAddress();
  }, [signer]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {address ? (
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
          <button 
            onClick={disconnect}
            className="ml-2 text-sm bg-white/20 hover:bg-white/30 rounded px-2 py-1"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={!window.ethereum}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all"
        >
          {!window.ethereum ? 'Install MetaMask' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}