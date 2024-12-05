"use client";

import { useState, useCallback } from 'react';
import { uploadToIPFS } from '@/utils/ipfs';
import Image from 'next/image';
import { useMemeForgeContract } from '@/hooks/useContract';

export default function MemeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const { contract, isWrongNetwork, switchNetwork } = useMemeForgeContract();

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !contract) return;

    try {
      setIsUploading(true);
      // Upload image to IPFS
      const ipfsHash = await uploadToIPFS(file);
      
      // Create and upload metadata
      const memeMetadata = {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags.split(',').map(tag => tag.trim()),
        image: ipfsHash
      };

      const metadataBlob = new Blob([JSON.stringify(memeMetadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json');
      const metadataHash = await uploadToIPFS(metadataFile);

      // Mint the meme NFT
      const tx = await contract.createMeme(metadataHash);
      await tx.wait();
      
      // Reset form
      setFile(null);
      setPreview('');
      setMetadata({ title: '', description: '', tags: '' });
      
    } catch (error) {
      console.error('Error creating meme:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {isWrongNetwork && (
        <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded">
          Wrong network detected. 
          <button 
            onClick={switchNetwork}
            className="ml-2 underline"
          >
            Switch network
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
        >
          {preview ? (
            <div className="relative h-64 w-full">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <p>Drag and drop your meme image here or click to browse</p>
          )}
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFile(file);
                setPreview(URL.createObjectURL(file));
              }
            }}
            accept="image/*"
            className="hidden"
          />
        </div>

        <input
          type="text"
          placeholder="Title"
          value={metadata.title}
          onChange={(e) => setMetadata({...metadata, title: e.target.value})}
          className="w-full p-2 border rounded"
        />

        <textarea
          placeholder="Description"
          value={metadata.description}
          onChange={(e) => setMetadata({...metadata, description: e.target.value})}
          className="w-full p-2 border rounded h-24"
        />

        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={metadata.tags}
          onChange={(e) => setMetadata({...metadata, tags: e.target.value})}
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          disabled={isUploading || !file}
          className="w-full bg-blue-500 text-white p-3 rounded disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Mint Meme'}
        </button>
      </form>
    </div>
  );
}