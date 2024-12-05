import MemeUpload from '@/components/meme/MemeUpload';
import VotingDashboard from '@/components/meme/VotingDashboard';
import WalletConnect from '@/components/WalletConnect';

export default function Home() {
  return (
    // <div></div>
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8">MemeForge</h1>
      <WalletConnect />
      
      <div className="max-w-7xl mx-auto space-y-16">
        <section>
          <h2 className="text-2xl font-bold mb-8">Create Meme</h2>
          <MemeUpload />
        </section>

        <section>
          <VotingDashboard />
        </section>
      </div>
    </div>
  );
}