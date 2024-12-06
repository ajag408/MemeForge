"use client";

import { useState } from 'react';
import MemeUpload from '@/components/meme/MemeUpload';
import VotingDashboard from '@/components/meme/VotingDashboard';
import FeaturedMemes from '@/components/meme/FeaturedMemes';
import TrendingMemes from '@/components/meme/TrendingMemes';
import Leaderboard from '@/components/meme/Leaderboard';

export default function Home() {
  const [activeTab, setActiveTab] = useState('featured');

  return (
    <div className="space-y-8">
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('featured')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'featured' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          Featured Memes
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'trending' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          Trending Memes
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'leaderboard' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === 'featured' && <FeaturedMemes />}
      {activeTab === 'trending' && <TrendingMemes />}
      {activeTab === 'leaderboard' && <Leaderboard />}
    </div>
  );
}