"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import MemeDisplay from './MemeDisplay';
import RemixEditor from './RemixEditor';
import { ethers } from 'ethers';
import { isClient } from '@/utils/isClient';
export default function TrendingMemes() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [eyeHolderStatuses, setEyeHolderStatuses] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const { memeForgeCore: contract } = useContract();

  useEffect(() => {
    const fetchMemes = async () => {
      if (!contract) return;

      try {
        if (!isClient || !window.ethereum) return;
        const nextTokenId = await contract.getNextTokenId();
        const memesData = [];
        const statusesMap = new Map<string, boolean>();

        // First pass: collect all unique creator addresses
        const creatorAddresses = new Set<string>();
        for (let i = 0; i < nextTokenId; i++) {
          try {
            const memeData = await contract.getMemeData(i);
            creatorAddresses.add(memeData.creator.toLowerCase());
          } catch (error) {
            console.log(`Skipping token ${i}`);
          }
        }

        // Check Eye holder status for all creators
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const eyeContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_EYE_NFT_ADDRESS!,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );

        await Promise.all(
          Array.from(creatorAddresses).map(async (creator) => {
            const balance = await eyeContract.balanceOf(creator);
            const hasEye = balance > 0;
            statusesMap.set(creator, hasEye);
            console.log(`Creator ${creator} Eye NFT Balance:`, balance.toString(), 'Is Eye Holder:', hasEye);
          })
        );

        setEyeHolderStatuses(statusesMap);

        // Second pass: fetch meme data and sort
        for (let i = 0; i < nextTokenId; i++) {
          try {
            const memeData = await contract.getMemeData(i);
            const creator = memeData.creator.toLowerCase();
            
            memesData.push({
              tokenId: i,
              uri: memeData.uri,
              creator: creator,
              likes: memeData.likes.toNumber(),
              remixes: memeData.remixes.toNumber(),
              votes: memeData.votes.toNumber(),
              isRemix: memeData.isRemix,
              originalMemeId: memeData.originalMemeId.toNumber(),
              timestamp: memeData.timestamp.toNumber(),
              isEyeHolder: statusesMap.get(creator) || false
            });
          } catch (error) {
            console.log(`Skipping token ${i}`);
          }
        }

        // Filter recent memes and sort with Eye holders first
        const now = Math.floor(Date.now() / 1000);
        const recentMemes = memesData.filter(meme => now - meme.timestamp < 86400);
        const sortedMemes = recentMemes.sort((a, b) => {
          if (a.isEyeHolder && !b.isEyeHolder) return -1;
          if (!a.isEyeHolder && b.isEyeHolder) return 1;
          return b.timestamp - a.timestamp;
        });

        console.log('Sorted Trending Memes:', sortedMemes.map(meme => ({
          tokenId: meme.tokenId,
          creator: meme.creator,
          isEyeHolder: meme.isEyeHolder,
          timestamp: meme.timestamp
        })));

        setMemes(sortedMemes.slice(0, 6));
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
    return <div className="text-center py-8">Loading trending memes...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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