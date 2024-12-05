"use client";

import { useState, useRef, useEffect } from 'react';
import type { Meme } from '@/types/meme';
import { uploadToIPFS } from '@/utils/ipfs';
import { useContract } from '@/contexts/ContractContext';

interface RemixEditorProps {
  originalMeme: Meme;
  onClose: () => void;
}

export default function RemixEditor({ originalMeme, onClose }: RemixEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const { contract, signer } = useContract();

  useEffect(() => {
    const loadImage = async () => {
      const response = await fetch(originalMeme.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
      const metadata = await response.json();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      
      img.onload = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
    };
    
    loadImage();
  }, [originalMeme.uri]);

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!contract || !signer || !canvasRef.current) return;

    setIsLoading(true);
    try {
      // Convert canvas to blob and upload to IPFS
      const blob = await new Promise<Blob>((resolve) => 
        canvasRef.current!.toBlob((blob) => resolve(blob as Blob))
      );
      
      const uniqueFilename = `remix-${Date.now()}.png`;
      const file = new File([blob], uniqueFilename, { type: 'image/png' });
      const imageHash = await uploadToIPFS(file);
      
      // Create and upload metadata
      const metadata = {
        title: title || 'Untitled Remix',
        description: description || 'A remixed meme',
        tags: tags,
        image: imageHash.startsWith('ipfs://') ? imageHash : `ipfs://${imageHash}`, // Ensure correct prefix
      };
      
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json');
      const metadataHash = await uploadToIPFS(metadataFile);
      
      // Create remix on blockchain
      const tx = await contract.remixMeme(originalMeme.tokenId, metadataHash);
      await tx.wait();
      
      onClose();
    } catch (error) {
      console.error('Error creating remix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Remix Meme</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="w-full border border-gray-700 rounded-lg bg-black/50"
            />
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white h-24"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <button
                  onClick={addTag}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Remix'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}