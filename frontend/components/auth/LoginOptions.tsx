"use client";

import { useState } from 'react';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { useContract } from '@/contexts/ContractContext';

export default function LoginOptions() {
  const { initializeSmartAccount } = useSmartAccount();
  const { connect } = useContract();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegularLogin = async () => {
    await connect();
  };

  const handleSmartAccountLogin = async () => {
    setIsLoading(true);
    try {
      await initializeSmartAccount();
    } catch (error) {
      console.error('Error creating smart account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Welcome to MemeForge</h2>
      
      <button
        onClick={handleRegularLogin}
        className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
      >
        Connect Regular Wallet
      </button>

      <button
        onClick={handleSmartAccountLogin}
        disabled={isLoading}
        className="w-full bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
      >
        {isLoading ? 'Creating Account...' : 'Create Smart Account'}
      </button>
    </div>
  );
} 