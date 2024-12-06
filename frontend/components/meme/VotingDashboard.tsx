"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from './MemeDisplay';
import RemixEditor from './RemixEditor';

interface VotingStats {
  likes: number;
  remixes: number;
  votes: number;
  creator: string;
}

export default function VotingDashboard() {
  const { contract, signer } = useContract();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [votingStats, setVotingStats] = useState<Record<number, VotingStats>>({});
  const [userCanVote, setUserCanVote] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    const checkVotingEligibility = async () => {
      if (!contract || !signer) return;
      try {
        const address = await signer.getAddress();
        const hasNFT = await contract.balanceOf(address);
        setUserCanVote(hasNFT.toNumber() > 0);
      } catch (error) {
        console.error('Error checking voting eligibility:', error);
      }
    };

    const loadMemes = async () => {
      if (!contract) return;
      try {
        const totalMemes = await contract.getNextTokenId();
        const memesData = await Promise.all(
            Array(totalMemes.toNumber())
              .fill(0)
              .map(async (_, i) => {
                const meme = await contract.getMemeData(i);
                const stats = {
                  likes: meme.likes.toNumber(),
                  remixes: meme.remixes.toNumber(),
                  votes: meme.votes.toNumber(),
                  creator: meme.creator
                };
                setVotingStats(prev => ({ ...prev, [i]: stats }));
                return {
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
              })
          );
        
        // Sort by votes
        const sortedMemes = memesData.sort((a, b) => b.votes - a.votes);
        setMemes(sortedMemes);
      } catch (error) {
        console.error('Error loading memes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVotingEligibility();
    loadMemes();

    // Set up event listener for vote updates
    if (contract) {
        contract.on("MemeVoted", async (memeId, voter) => {
            try {
              const memeData = await contract.getMemeData(memeId.toNumber());
              const newVoteCount = memeData.votes.toNumber();
        
              // Update voting stats
              setVotingStats(prev => ({
                ...prev,
                [memeId.toNumber()]: {
                  ...prev[memeId.toNumber()],
                  votes: newVoteCount
                }
              }));
        
              // Update memes array
              setMemes(prev => 
                prev.map(meme => 
                  meme.tokenId === memeId.toNumber() 
                    ? { ...meme, votes: newVoteCount }
                    : meme
                ).sort((a, b) => b.votes - a.votes) // Re-sort after update
              );
            } catch (error) {
              console.error('Error updating vote count:', error);
            }
          });
      }

    return () => {
      if (contract) {
        contract.removeAllListeners("MemeVoted");
      }
    };
  }, [contract, signer]);

  const handleVote = async (memeId: number) => {
    if (!contract || !signer) {
      alert("Please connect your wallet to vote");
      return;
    }

    if (!userCanVote) {
      alert("You need to hold a MemeForge NFT to vote");
      return;
    }

    try {
      const tx = await contract.voteMeme(memeId);
      await tx.wait();
      
      // Update will happen through event listener
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading voting dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Top Memes</h2>
        
        {!userCanVote && (
          <div className="bg-yellow-500/20 text-yellow-300 p-4 rounded-lg mb-6">
            ⚠️ You need to hold a MemeForge NFT to participate in voting
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memes.map((meme) => (
            <div key={meme.tokenId} className="space-y-2">
              <MemeDisplay meme={meme} />
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Creator:</span>
                  <span className="text-purple-400">
                    {meme.creator.slice(0, 6)}...{meme.creator.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => handleVote(meme.tokenId)}
                  disabled={!userCanVote}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Vote ({votingStats[meme.tokenId]?.votes || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Rewards Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Monthly Rewards</h2>
        <div className="space-y-4">
          <div className="bg-green-500/20 text-green-300 p-4 rounded-lg">
            🏆 Top voted memes this month will receive exclusive NFTs and tokens!
          </div>
          {/* Add rewards display logic here */}
        </div>
      </div>
    </div>
  );
}