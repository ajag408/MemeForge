"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Meme, MemeMetadata } from '@/types/meme';
import { useContract } from '@/contexts/ContractContext';
import { useEyeHolderStatus } from '@/hooks/useEyeHolderStatus';

interface MemeDisplayProps {
  meme: Meme;
  onRemix?: (meme: Meme) => void;
  showFullSize?: boolean;
}

export default function MemeDisplay({ meme, onRemix, showFullSize }: MemeDisplayProps) {
  const [isLiking, setIsLiking] = useState(false);
  const { contract, signer } = useContract();
  const [metadata, setMetadata] = useState<MemeMetadata | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const { isEyeHolder } = useEyeHolderStatus(meme.creator);
  const [isSponsored, setIsSponsored] = useState(false);

  useEffect(() => {
    const checkSponsorship = async () => {
      if (!contract || !meme.tokenId) return;
      const sponsored = await contract.sponsoredMemes(meme.tokenId);
      setIsSponsored(sponsored);
    };
    checkSponsorship();
  }, [contract, meme.tokenId]);

  const handleRemix = () => {
    if (!signer) {
      alert("Please connect your wallet to remix");
      return;
    }
    if (onRemix) {
      onRemix(meme);
    }
  };

  const handleLike = async () => {
    if (!contract || !signer) {
      alert("Please connect your wallet to like");
      return;
    }
    
    try {
      setIsLiking(true);
      const tx = await contract.likeMeme(meme.tokenId);
      await tx.wait();
      
      const updatedMeme = await contract.getMemeData(meme.tokenId);
      meme.likes = updatedMeme.likes.toNumber();
    } catch (error) {
      console.error('Error liking meme:', error);
    } finally {
      setIsLiking(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(meme.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
        const metadataResponse = await response.json();
        setMetadata(metadataResponse);
        setImageUrl(metadataResponse.image.replace('ipfs://', 'https://ipfs.io/ipfs/'));
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };

    fetchMetadata();
  }, [meme.uri]);

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      {isEyeHolder && (
        <div className="absolute top-2 right-2 bg-purple-500/80 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 z-10">
          👁️ Eye Holder
        </div>
      )}
      {isSponsored && (
        <div className="absolute top-2 left-2 bg-green-500/80 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 z-10">
          ✨ Sponsored Remixes
        </div>
      )}
      <div className="border-2 border-purple-500/20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl hover-scale">
        <div className={`relative ${showFullSize ? 'w-full h-[600px]' : 'aspect-square w-full'} bg-black/50`}>
          {imageUrl && (
            <Link href={`/meme/${meme.tokenId}`}>
              <Image
                src={imageUrl}
                alt={metadata?.title || "Meme"}
                fill
                className="object-contain"
                priority={showFullSize}
              />
            </Link>
          )}
        </div>
        
        <div className="p-6 space-y-4 backdrop-blur-lg bg-black/20">
          {metadata && (
            <div className="space-y-3">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {metadata.title}
              </h3>
              <p className="text-gray-300">{metadata.description}</p>
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag, i) => (
                  <span key={i} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30 hover:bg-purple-500/30 transition-colors">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
            <div className="flex gap-6">
              <button 
                onClick={handleLike}
                disabled={isLiking}
                className="flex items-center gap-2 hover:text-pink-500 transition-all transform hover:scale-110"
              >
                {isLiking ? '💗' : '❤️'} {meme.likes}
              </button>
              <span className="flex items-center gap-2 text-blue-400">
                <span className="transform hover:rotate-180 transition-transform duration-500">🔄</span> {meme.remixes}
              </span>
              <span className="flex items-center gap-2 text-green-400">
                <span className="transform hover:scale-110 transition-transform">🗳️</span> {meme.votes}
              </span>
            </div>
            
            <button
              onClick={handleRemix}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 hover:shadow-lg"
            >
              🎨 Remix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}