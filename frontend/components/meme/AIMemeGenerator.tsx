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
  const { hasKeyNFT, isLoading } = useNFTGating();

  const handleGenerate = async () => {
    if (!hasKeyNFT) {
      alert('You need a Key NFT to use AI generation');
      return;
    }

    try {
      setIsGenerating(true);
      const imageUrl = await generateMemeImage(prompt);
      onImageGenerated(imageUrl);
    } catch (error) {
      console.error('Error generating meme:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div>Checking NFT status...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl mb-6">
      <h3 className="text-xl font-bold text-white mb-4">🤖 AI Meme Generator</h3>
      {!hasKeyNFT ? (
        <div className="bg-yellow-500/20 text-yellow-300 p-4 rounded-lg">
          ⚠️ You need a Key NFT to use AI generation
        </div>
      ) : (
        <div className="space-y-4">
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
      )}
    </div>
  );
}
