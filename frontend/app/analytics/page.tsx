"use client";

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Analytics Dashboard</h1>
      <AnalyticsDashboard />
    </div>
  );
}