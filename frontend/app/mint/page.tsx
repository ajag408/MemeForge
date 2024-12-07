"use client";

import { useState } from 'react';
import { useNFTGating } from '@/hooks/useNFTGating';
import MemeUpload from '@/components/meme/MemeUpload';
import AIMemeGenerator from '@/components/meme/AIMemeGenerator';

export default function MintPage() {
  const { hasKeyNFT, signer } = useNFTGating();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleAIGenerated = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const renderAISection = () => {
    if (!signer) {
      return (
        <div className="bg-yellow-500/20 text-yellow-300 p-4 rounded-lg">
          ⚠️ Please connect your wallet to use AI generation
        </div>
      );
    }

    if (!hasKeyNFT) {
      return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-white mb-4">
            🤖 AI Meme Generator
          </h3>
          <div className="space-y-4">
            <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">
              🔒 This feature requires a Key NFT
            </div>
            <div className="text-gray-400 text-sm">
              <p>Unlock AI meme generation to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Getting a Key NFT</li>
                <li>Accessing advanced meme creation tools</li>
                <li>Creating unique AI-generated memes</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return <AIMemeGenerator onImageGenerated={handleAIGenerated} />;
  };

  return (
    <div className="space-y-8">
      {renderAISection()}
      <MemeUpload selectedImage={selectedImage} />
    </div>
  );
}