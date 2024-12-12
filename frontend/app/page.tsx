"use client";

import { useState } from 'react';
import MemeUpload from '@/components/meme/MemeUpload';
import VotingDashboard from '@/components/meme/VotingDashboard';
// import FeaturedMemes from '@/components/meme/FeaturedMemes';
import TrendingMemes from '@/components/meme/TrendingMemes';
import Leaderboard from '@/components/meme/Leaderboard';
import AllMemes from '@/components/meme/AllMemes';
import dynamic from 'next/dynamic'

const FeaturedMemes = dynamic(
  () => import('@/components/meme/FeaturedMemes'),
  { ssr: false }
)

export default function Home() {
  const [activeTab, setActiveTab] = useState('featured');

  return (
    <div className="space-y-8 animate-gradient bg-gradient-to-br from-purple-900 via-pink-800 to-blue-900 p-8 rounded-2xl">
      <div className="flex space-x-4 mb-8 backdrop-blur-lg bg-black/20 p-4 rounded-xl">
        <button
          onClick={() => setActiveTab('featured')}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'featured' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          ✨ Featured Memes
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'trending' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          🔥 Trending Memes
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'leaderboard' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          👑 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'leaderboard' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          🎭 All Memes
        </button>
      </div>

      <div className="backdrop-blur-lg bg-black/20 p-6 rounded-xl">
        {activeTab === 'featured' && <FeaturedMemes />}
        {activeTab === 'trending' && <TrendingMemes />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'all' && <AllMemes/>}
      </div>
    </div>
  );
}