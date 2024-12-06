"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Meme } from '@/types/meme';
import { uploadToIPFS } from '@/utils/ipfs';
import { useContract } from '@/contexts/ContractContext';

interface RemixEditorProps {
  originalMeme: Meme;
  onClose: () => void;
}

export default function RemixEditor({ originalMeme, onClose }: RemixEditorProps) {
  const { contract, signer } = useContract();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalMetadata, setOriginalMetadata] = useState<any>(null);
  const [textOverlay, setTextOverlay] = useState({
    topText: '',
    bottomText: '',
    fontSize: '400',
    color: '#ffffff'
  });

  useEffect(() => {
    const loadOriginalMeme = async () => {
      const response = await fetch(originalMeme.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
      const metadata = await response.json();
      setOriginalMetadata(metadata);
      
      // If original had text overlay, initialize with those values
      if (metadata.textOverlay) {
        setTextOverlay(metadata.textOverlay);
      }

      const img = document.createElement('img');
      img.crossOrigin = "anonymous";
      img.src = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      
      img.onload = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
        updateCanvas();
      };
    };
    
    loadOriginalMeme();
  }, [originalMeme.uri]);

  const updateCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Redraw original image
    if (originalMetadata) {
    const img = document.createElement('img');
      img.crossOrigin = "anonymous";
      img.src = originalMetadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      
      img.onload = () => {
        if (!canvasRef.current) return;
        ctx.drawImage(img, 0, 0);

        // Add text overlays
        ctx.font = `bold ${textOverlay.fontSize}px Impact`;
        ctx.fillStyle = textOverlay.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        
        if (textOverlay.topText) {
          ctx.strokeText(textOverlay.topText, canvasRef.current.width/2, 200);
          ctx.fillText(textOverlay.topText, canvasRef.current.width/2, 200);
        }
        
        if (textOverlay.bottomText) {
          ctx.strokeText(textOverlay.bottomText, canvasRef.current.width/2, canvasRef.current.height - 30);
          ctx.fillText(textOverlay.bottomText, canvasRef.current.width/2, canvasRef.current.height - 30);
        }
      };
    }
  };

  useEffect(() => {
    updateCanvas();
  }, [textOverlay, originalMetadata]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      setTags([...tags, e.currentTarget.value.trim()]);
      e.currentTarget.value = '';
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
        tags: [...tags, `Forked from #${originalMeme.tokenId}`],
        textOverlay: textOverlay,
        originalCreator: originalMeme.creator,
        originalMemeId: originalMeme.tokenId,
        image: imageHash.startsWith('ipfs://') ? imageHash : `ipfs://${imageHash}`,
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
          <div>
            <h2 className="text-2xl font-bold text-white">Remix Meme</h2>
            <p className="text-sm text-gray-400">
              Original by {originalMeme.creator.slice(0, 6)}...{originalMeme.creator.slice(-4)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="w-full border border-gray-700 rounded-lg bg-black/50"
            />
            
            {/* Text Overlay Controls */}
            <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-bold mb-4">Text Options</h3>
              <input
                type="text"
                placeholder="Enter top text"
                value={textOverlay.topText}
                onChange={(e) => setTextOverlay({...textOverlay, topText: e.target.value})}
                className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Enter bottom text"
                value={textOverlay.bottomText}
                onChange={(e) => setTextOverlay({...textOverlay, bottomText: e.target.value})}
                className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm mb-2">Font Size</label>
                  <input
                    type="number"
                    min="20"
                    max="600"
                    value={textOverlay.fontSize}
                    onChange={(e) => setTextOverlay({...textOverlay, fontSize: e.target.value})}
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm mb-2">Text Color</label>
                  <input
                    type="color"
                    value={textOverlay.color}
                    onChange={(e) => setTextOverlay({...textOverlay, color: e.target.value})}
                    className="w-full p-2 h-10 border rounded bg-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

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

            <div>
              <label className="block text-white text-sm mb-2">Tags</label>
              <input
                type="text"
                placeholder="Press Enter to add tags"
                onKeyDown={handleAddTag}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-purple-200"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
              {isLoading ? 'Creating Remix...' : 'Create Remix'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}