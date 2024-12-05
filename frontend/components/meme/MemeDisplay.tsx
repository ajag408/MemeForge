"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Meme } from '@/types/meme';
import { useMemeForgeContract } from '@/hooks/useContract';

interface MemeDisplayProps {
  meme: Meme;
  onRemix?: (meme: Meme) => void;
}

interface MemeMetadata {
  title: string;
  description: string;
  tags: string[];
  image: string;
}

export default function MemeDisplay({ meme, onRemix }: MemeDisplayProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<MemeMetadata | null>(null);
  const [likes, setLikes] = useState(meme.likes);
  const { contract } = useMemeForgeContract();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(meme.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
        const data: MemeMetadata = await response.json();
        setMetadata(data);
        setImageUrl(data.image.replace('ipfs://', 'https://ipfs.io/ipfs/'));
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };

    fetchMetadata();
  }, [meme.uri]);

  const handleLike = async () => {
    if (!contract) return;
    
    setIsLiking(true);
    try {
      const tx = await contract.likeMeme(meme.tokenId);
      await tx.wait();
      setLikes(prev => prev + 1);
    } catch (error) {
      console.error('Error liking meme:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl">
      <div className="relative aspect-square w-full bg-black/50">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={metadata?.title || "Meme"}
            fill
            className="object-contain"
          />
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {metadata && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{metadata.title}</h3>
            <p className="text-gray-300">{metadata.description}</p>
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map((tag, i) => (
                <span key={i} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-2 hover:text-pink-500 transition-colors"
            >
              ❤️ {likes}
            </button>
            <span className="text-blue-400">🔄 {meme.remixes}</span>
            <span className="text-green-400">🗳️ {meme.votes}</span>
          </div>
          
          <button
            onClick={() => onRemix?.(meme)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Remix
          </button>
        </div>
      </div>
    </div>
  );
}