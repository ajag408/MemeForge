"use client";

import Link from 'next/link';
import { useContract } from '@/contexts/ContractContext';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import WalletConnect from '../WalletConnect';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { signer } = useContract();
  const { smartAccountAddress } = useSmartAccount();
  const isConnected = !!signer || !!smartAccountAddress;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <nav className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/"  className="text-2xl font-bold bg-gradient-to-br from-purple-900 via-pink-800 to-blue-900 bg-clip-text text-transparent">
                MemeForge
              </Link>
              
              <div className="ml-10 flex items-center space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Home
                </Link>
                <Link href="/mint" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Mint
                </Link>
                {isConnected && (
                  <Link href="/my-memes" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                    My Memes
                  </Link>
                )}
                <Link href="/dao" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  DAO Voting
                </Link>
              </div>
            </div>
            
            <WalletConnect />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}