"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from './MemeDisplay';
import RemixEditor from './RemixEditor';

export default function VotingDashboard() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const { contract, signer } = useContract();

  useEffect(() => {
    console.log("useEffect triggered with contract:", contract);

    const fetchMemes = async () => {

      if (!contract) return;

      try {
        // Get the next token ID (represents total memes created)
        const nextTokenId = 5;
        // const nextTokenId = await contract.getNextTokenId();

        const memesData = [];

        // Fetch each meme's data
        for (let i = 0; i < nextTokenId; i++) {
          try {
            const memeData = await contract.getMemeData(i);
            memesData.push({
              tokenId: i,
              uri: memeData.uri,
              creator: memeData.creator,
              likes: memeData.likes.toNumber(),
              remixes: memeData.remixes.toNumber(),
              votes: memeData.votes.toNumber(),
              isRemix: memeData.isRemix,
              originalMemeId: memeData.originalMemeId.toNumber(),
              timestamp: memeData.timestamp.toNumber()
            });
          } catch (error) {
            console.log(`Skipping token ${i}, might be burned or invalid`);
          }
        }

        setMemes(memesData);
      } catch (error) {
        console.error('Error fetching memes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemes();
  }, [contract]);

  const handleRemix = (meme: Meme) => {
    setSelectedMeme(meme);
  };
  const handleVote = async (memeId: number) => {
    if (!contract) return;
    if (!signer) {
      alert("Please connect your wallet to vote");
      return;
    }

    try {
      const tx = await contract.voteMeme(memeId);
      await tx.wait();
      const updatedMeme = await contract.getMemeData(memeId);
      setMemes(memes.map(meme => 
        meme.tokenId === memeId 
          ? { ...meme, votes: updatedMeme.votes.toNumber() }
          : meme
      ));
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading memes...</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Vote for Your Favorite Memes</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memes.map((meme) => (
          <div key={meme.tokenId} className="space-y-2">
            <MemeDisplay meme={meme} onRemix={handleRemix} />
            <button
              onClick={() => handleVote(meme.tokenId)}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded"
            >
              Vote
            </button>
          </div>
        ))}
      </div>
      {selectedMeme && (
        <RemixEditor 
          originalMeme={selectedMeme} 
          onClose={() => setSelectedMeme(null)} 
        />
      )}
    </div>
  );
}