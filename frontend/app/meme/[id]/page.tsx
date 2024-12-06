"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useContract } from '@/contexts/ContractContext';
import type { Meme } from '@/types/meme';
import Image from 'next/image';
import Link from 'next/link';

export default function MemePage() {
  const params = useParams();
  const [meme, setMeme] = useState<Meme | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { contract } = useContract();

  useEffect(() => {
    const fetchMeme = async () => {
      if (!contract || !params.id) return;

      try {
        const memeData = await contract.getMemeData(Number(params.id));
        const newMeme = {
          tokenId: Number(params.id),
          uri: memeData.uri,
          creator: memeData.creator,
          likes: memeData.likes.toNumber(),
          remixes: memeData.remixes.toNumber(),
          votes: memeData.votes.toNumber(),
          isRemix: memeData.isRemix,
          originalMemeId: memeData.originalMemeId.toNumber(),
          timestamp: memeData.timestamp.toNumber()
        };
        setMeme(newMeme);

        // Fetch metadata
        const response = await fetch(memeData.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
        const metadataResponse = await response.json();
        setMetadata(metadataResponse);
        setImageUrl(metadataResponse.image.replace('ipfs://', 'https://ipfs.io/ipfs/'));
      } catch (error) {
        console.error('Error fetching meme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeme();
  }, [contract, params.id]);

  if (isLoading) return <div>Loading...</div>;
  if (!meme || !metadata) return <div>Meme not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Meme Image */}
        <div className="relative w-full h-[600px]">
          <Image
            src={imageUrl}
            alt={metadata.title}
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Metadata and Actions */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">{metadata.title}</h1>
            <p className="text-gray-300">{metadata.description}</p>
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map((tag: string, i: number) => (
                <span key={i} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-8 text-lg">
            <button className="flex items-center gap-2 text-pink-500 hover:text-pink-400">
              <span>❤️</span>
              <span>{meme.likes} Likes</span>
            </button>
            <div className="flex items-center gap-2 text-blue-400">
              <span>🔄</span>
              <span>{meme.remixes} Remixes</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span>🗳️</span>
              <span>{meme.votes} Votes</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600">
              Remix Meme
            </button>
            <button className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
              Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
