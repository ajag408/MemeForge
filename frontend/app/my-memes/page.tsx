"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from '@/components/meme/MemeDisplay';
import RemixEditor from '@/components/meme/RemixEditor';
import { ethers } from 'ethers';

interface ProfileStats {
  totalLikes: number;
  totalRemixes: number;
  totalVotes: number;
  royaltiesEarned: number;
  gasBackEarned: number;
}

export default function ProfilePage() {
  const { memeForgeCore: contract, memeForgeGasBack: gasBackContract, signer } = useContract();
  const [mintedMemes, setMintedMemes] = useState<Meme[]>([]);
  const [remixedMemes, setRemixedMemes] = useState<Meme[]>([]);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalLikes: 0,
    totalRemixes: 0,
    totalVotes: 0,
    royaltiesEarned: 0,
    gasBackEarned: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimingGasBack, setIsClaimingGasBack] = useState(false);

  useEffect(() => {
    const loadUserMemes = async () => {
      if (!contract || !signer || !gasBackContract) return;

      try {
        const address = await signer.getAddress();
        const nextTokenId = await contract.getNextTokenId();
        const minted = [];
        const remixed = [];

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
        
        const gasBackBalance = await gasBackContract.creatorRewards(address);
        const totalStats = {
          totalLikes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.likes, 0),
          totalRemixes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.remixes, 0),
          totalVotes: [...minted, ...remixed].reduce((sum, meme) => sum + meme.votes, 0),
          royaltiesEarned: 0,
          gasBackEarned: Number(ethers.utils.formatEther(gasBackBalance))
        };
        
        setStats(totalStats);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserMemes();
  }, [contract, signer, gasBackContract]);

  const handleRemix = (meme: Meme) => {
    setSelectedMeme(meme);
  };

  const handleClaimGasBack = async () => {
    if (!gasBackContract || !signer) {
      alert("Please connect your wallet to claim GasBack");
      return;
    }

    try {
      setIsClaimingGasBack(true);
      const tx = await gasBackContract.withdrawRewards();
      await tx.wait();
      alert("Successfully claimed GasBack rewards!");
    } catch (error) {
      console.error("Error claiming GasBack:", error);
      alert("Failed to claim GasBack. Please try again.");
    } finally {
      setIsClaimingGasBack(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Profile Stats & Rewards Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Your Rewards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Stats Card */}
          <div className="bg-purple-500/20 text-purple-300 p-4 rounded-lg">
            <p className="text-lg">🎨 Total Likes: {stats.totalLikes}</p>
            <p className="text-lg">🔄 Total Remixes: {stats.totalRemixes}</p>
            <p className="text-lg">🗳️ Total Votes: {stats.totalVotes}</p>
          </div>
          
          {/* Rewards Card */}
          <div className="bg-green-500/20 text-green-300 p-4 rounded-lg">
            <p className="text-lg">💰 Royalties Earned: {stats.royaltiesEarned} ETH</p>
            <p className="text-lg">⛽ GasBack Earned: {stats.gasBackEarned} ETH</p>
            <button
              onClick={handleClaimGasBack}
              disabled={isClaimingGasBack || !signer || stats.gasBackEarned <= 0}
              className="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isClaimingGasBack ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Claiming...
                </span>
              ) : (
                "Claim GasBack"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Minted Memes Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Your Original Memes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mintedMemes.map((meme) => (
            <MemeDisplay key={meme.tokenId} meme={meme} onRemix={handleRemix} />
          ))}
        </div>
      </div>

      {/* Remixed Memes Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Your Remixed Memes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {remixedMemes.map((meme) => (
            <MemeDisplay key={meme.tokenId} meme={meme} onRemix={handleRemix} />
          ))}
        </div>
      </div>

      {/* Remix Editor Modal */}
      {selectedMeme && (
        <RemixEditor 
          originalMeme={selectedMeme} 
          onClose={() => setSelectedMeme(null)} 
        />
      )}
    </div>
  );
}
