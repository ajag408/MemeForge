import { useState } from 'react';
import { useNFTGating } from '@/hooks/useNFTGating';
import { generateMemeImage } from '@/services/aiService';
import Image from 'next/image';

interface AIMemeGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
}

export default function AIMemeGenerator({ onImageGenerated }: AIMemeGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { hasKeyNFT, signer } = useNFTGating();

  const handleGenerate = async () => {
    if (!signer || !hasKeyNFT) return;

    try {
      setIsGenerating(true);
      const imageUrl = await generateMemeImage(prompt);
      
      await new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      onImageGenerated(imageUrl);
    } catch (error) {
      console.error('Error generating meme:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl mb-6">
      <h3 className="text-xl font-bold text-white mb-4">
        🤖 AI Meme Generator 
        <span className="ml-2 text-sm font-normal text-green-400">
          (✨ Unlocked with your Key NFT)
        </span>
      </h3>
      
      <div className="space-y-4">
        <div className="bg-green-500/20 text-green-300 p-2 rounded-lg text-sm">
          ✨ AI Generation unlocked with your Key NFT
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your meme idea..."
          className="w-full p-3 bg-gray-700 text-white rounded-lg"
          rows={3}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {isGenerating ? '🤖 Generating...' : '🤖 Generate with AI'}
        </button>
      </div>
    </div>
  );
}
