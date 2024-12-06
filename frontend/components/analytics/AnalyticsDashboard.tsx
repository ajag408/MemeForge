"use client";

import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface TagStats {
  tag: string;
  count: number;
  totalLikes: number;
  totalRemixes: number;
}

interface EarningsData {
  creator: string;
  earnings: number;
}

export default function AnalyticsDashboard() {
  const { contract } = useContract();
  const [trendingTags, setTrendingTags] = useState<TagStats[]>([]);
  const [topEarners, setTopEarners] = useState<EarningsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!contract) return;

      try {
        const nextTokenId = await contract.getNextTokenId();
        const tagMap = new Map<string, TagStats>();
        const earningsMap = new Map<string, number>();

        // Fetch all memes and analyze their metadata
        for (let i = 0; i < nextTokenId; i++) {
          const memeData = await contract.getMemeData(i);
          const response = await fetch(memeData.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
          const metadata = await response.json();

          // Process tags
          metadata.tags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, { tag, count: 0, totalLikes: 0, totalRemixes: 0 });
            }
            const stats = tagMap.get(tag)!;
            stats.count++;
            stats.totalLikes += memeData.likes.toNumber();
            stats.totalRemixes += memeData.remixes.toNumber();
          });

          // Process earnings (if available)
          const earnings = await contract.getCreatorEarnings(memeData.creator);
          earningsMap.set(memeData.creator, earnings.toNumber());
        }

        // Sort and set trending tags
        const sortedTags = Array.from(tagMap.values())
          .sort((a, b) => (b.totalLikes + b.totalRemixes) - (a.totalLikes + a.totalRemixes))
          .slice(0, 10);
        setTrendingTags(sortedTags);

        // Sort and set top earners
        const sortedEarners = Array.from(earningsMap.entries())
          .map(([creator, earnings]) => ({ creator, earnings }))
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, 5);
        setTopEarners(sortedEarners);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [contract]);

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Trending Tags Section */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Trending Tags</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {trendingTags.map((tag) => (
            <div key={tag.tag} className="bg-gray-700 p-4 rounded-lg">
              <div className="text-lg font-bold text-purple-400">#{tag.tag}</div>
              <div className="text-sm text-gray-300">
                Used {tag.count} times
                <br />
                {tag.totalLikes} likes • {tag.totalRemixes} remixes
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Earners Section */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Top Earners</h2>
        <div className="space-y-4">
          {topEarners.map((earner, index) => (
            <div key={earner.creator} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{index === 0 ? '👑' : `${index + 1}`}</span>
                <span className="text-purple-400">
                  {earner.creator.slice(0, 6)}...{earner.creator.slice(-4)}
                </span>
              </div>
              <div className="text-green-400">{earner.earnings} ETH</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
