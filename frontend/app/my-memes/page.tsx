"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from '@/components/meme/MemeDisplay';

interface ProfileStats {
  totalLikes: number;
  totalRemixes: number;
  totalVotes: number;
  royaltiesEarned: number;
  gasBackEarned: number;
}

export default function ProfilePage() {
  const { contract, signer } = useContract();
  const [mintedMemes, setMintedMemes] = useState<Meme[]>([]);
  const [remixedMemes, setRemixedMemes] = useState<Meme[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    totalLikes: 0,
    totalRemixes: 0,
    totalVotes: 0,
    royaltiesEarned: 0,
    gasBackEarned: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('minted');

  useEffect(() => {
    const loadUserMemes = async () => {
      if (!contract || !signer) return;

      try {
        const address = await signer.getAddress();
        const nextTokenId = await contract.getNextTokenId();
        const minted = [];
        const remixed = [];

        // Fetch all memes and filter by creator/remixer
        for (let i = 0; i < nextTokenId; i++) {
          const meme = await contract.getMemeData(i);
          const memeData = {
            tokenId: i,
            uri: meme.uri,
            creator: meme.creator,
            likes: meme.likes.toNumber(),
            remixes: meme.remixes.toNumber(),
            votes: meme.votes.toNumber(),
            isRemix: meme.isRemix,
            originalMemeId: meme.originalMemeId.toNumber(),
            timestamp: meme.timestamp.toNumber()
          };

          if (meme.creator.toLowerCase() === address.toLowerCase()) {
            if (meme.isRemix) {
              remixed.push(memeData);
            } else {
              minted.push(memeData);
            }
          }
        }

        setMintedMemes(minted);
        setRemixedMemes(remixed);
        
        // Calculate total stats
        const totalStats = {
          totalLikes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.likes, 0),
          totalRemixes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.remixes, 0),
          totalVotes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.votes, 0),
          royaltiesEarned: 0, // To be implemented with contract
          gasBackEarned: 0 // To be implemented with contract
        };
        
        setStats(totalStats);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserMemes();
  }, [contract, signer]);

  if (isLoading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-purple-200">Engagement</h3>
          <div className="mt-2 space-y-1">
            <p className="text-white">❤️ {stats.totalLikes} Likes</p>
            <p className="text-white">🔄 {stats.totalRemixes} Remixes</p>
            <p className="text-white">🗳️ {stats.totalVotes} Votes</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-200">Rewards</h3>
          <div className="mt-2 space-y-1">
            <p className="text-white">💰 {stats.royaltiesEarned} ETH Royalties</p>
            <p className="text-white">⛽ {stats.gasBackEarned} ETH GasBack</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4">
        <button
          onClick={() => setActiveTab('minted')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'minted' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          Minted Memes ({mintedMemes.length})
        </button>
        <button
          onClick={() => setActiveTab('remixed')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'remixed' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          Remixed Memes ({remixedMemes.length})
        </button>
      </div>

      {/* Meme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'minted' 
          ? mintedMemes.map(meme => <MemeDisplay key={meme.tokenId} meme={meme} />)
          : remixedMemes.map(meme => <MemeDisplay key={meme.tokenId} meme={meme} />)
        }
      </div>
    </div>
  );
}
