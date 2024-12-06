"use client";

import { useState } from 'react';
import { useNFTGating } from '@/hooks/useNFTGating';
import MemeUpload from '@/components/meme/MemeUpload';
import AIMemeGenerator from '@/components/meme/AIMemeGenerator';

export default function MintPage() {
  const { hasKeyNFT } = useNFTGating();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleAIGenerated = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  return (
    <div className="space-y-8">
      {hasKeyNFT && (
        <AIMemeGenerator onImageGenerated={handleAIGenerated} />
      )}
      <MemeUpload selectedImage={selectedImage} />
    </div>
  );
}