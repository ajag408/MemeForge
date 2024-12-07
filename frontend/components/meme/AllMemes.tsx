"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from './MemeDisplay';
import RemixEditor from './RemixEditor';

export default function AllMemes() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const { contract } = useContract();

  useEffect(() => {
    const fetchMemes = async () => {
      if (!contract) return;

      try {
        const nextTokenId = await contract.getNextTokenId();
        const memesData = [];

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
            console.log(`Skipping token ${i}`);
          }
        }

        // Sort by newest first
        const sortedMemes = memesData.sort((a, b) => b.timestamp - a.timestamp);
        setMemes(sortedMemes);
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

  if (isLoading) {
    return <div className="text-center py-8">Loading all memes...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memes.map((meme) => (
          <MemeDisplay key={meme.tokenId} meme={meme} onRemix={handleRemix} />
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