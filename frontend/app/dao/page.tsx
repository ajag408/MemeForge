"use client";

import VotingDashboard from '@/components/meme/VotingDashboard';

export default function DAOPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">DAO Voting Dashboard</h1>
      <VotingDashboard />
    </div>
  );
}