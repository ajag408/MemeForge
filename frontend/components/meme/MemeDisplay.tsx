"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Meme, MemeMetadata } from '@/types/meme';
import { useContract } from '@/contexts/ContractContext';

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
    if (!contract ||!signer) {
      alert("Please connect your wallet to like");
      return;
    }
    
      try {
        setIsLiking(true);
        const tx = await contract.likeMeme(meme.tokenId);
        await tx.wait();
        
        // Update local like count
        const updatedMeme = await contract.getMemeData(meme.tokenId);
        meme.likes = updatedMeme.likes.toNumber();
      } catch (error) {
        console.error('Error liking meme:', error);
      } finally {
        setIsLiking(false);
      }
  };

  // Fetch metadata and image URL
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
    <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl">
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
              ❤️ {meme.likes}
            </button>
            <span className="text-blue-400">🔄 {meme.remixes}</span>
            <span className="text-green-400">🗳️ {meme.votes}</span>
          </div>
          
          <button
            onClick={handleRemix}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Remix
          </button>
        </div>
      </div>
    </div>
  );
}