"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import { ethers } from 'ethers';

interface CreatorStats {
  address: string;
  totalLikes: number;
  totalRemixes: number;
  totalVotes: number;
  memeCount: number;
}

export default function Leaderboard() {
  const [creators, setCreators] = useState<CreatorStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { memeForgeCore: contract } = useContract();

  useEffect(() => {
    const fetchCreatorStats = async () => {
      if (!contract) return;

      try {
        const nextTokenId = await contract.getNextTokenId();
        const creatorMap = new Map<string, CreatorStats>();

        for (let i = 0; i < nextTokenId; i++) {
          try {
            const memeData = await contract.getMemeData(i);
            const creator = memeData.creator.toLowerCase();

            if (!creatorMap.has(creator)) {
              creatorMap.set(creator, {
                address: creator,
                totalLikes: 0,
                totalRemixes: 0,
                totalVotes: 0,
                memeCount: 0
              });
            }

            const stats = creatorMap.get(creator)!;
            stats.totalLikes += memeData.likes.toNumber();
            stats.totalRemixes += memeData.remixes.toNumber();
            stats.totalVotes += memeData.votes.toNumber();
            stats.memeCount += 1;
          } catch (error) {
            console.log(`Skipping token ${i}`);
          }
        }

        const sortedCreators = Array.from(creatorMap.values())
          .sort((a, b) => 
            (b.totalLikes + b.totalRemixes + b.totalVotes) - 
            (a.totalLikes + a.totalRemixes + a.totalVotes)
          );

        setCreators(sortedCreators.slice(0, 10)); // Show top 10 creators
      } catch (error) {
        console.error('Error fetching creator stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorStats();
  }, [contract]);

  if (isLoading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Creator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Memes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Likes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Remixes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Votes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {creators.map((creator, index) => (
              <tr key={creator.address} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {`${creator.address.slice(0, 6)}...${creator.address.slice(-4)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{creator.memeCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{creator.totalLikes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{creator.totalRemixes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{creator.totalVotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}