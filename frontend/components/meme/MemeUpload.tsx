"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadToIPFS } from '@/utils/ipfs';
import Image from 'next/image';
import { useContract } from '@/contexts/ContractContext';

const MEME_TEMPLATES = [
  { name: "Disaster Girl", url: "/templates/disaster-girl.jpg" },
  { name: "HODL", url: "/templates/hodl.png" },
  // Add more templates as needed
];

interface MemeUploadProps {
  selectedImage: string | null;
}

export default function MemeUpload({ selectedImage }: MemeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: '',
    textOverlay: {
      topText: '',
      bottomText: '',
      fontSize: '400',
      color: '#ffffff'
    }
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { contract, signer } = useContract();

  useEffect(() => {
    if (selectedImage) {
      fetch(selectedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'ai-generated.png', { type: 'image/png' });
          setFile(file);
          setPreview(selectedImage);
        });
    }
  }, [selectedImage]);

  const handleTemplateSelect = async (templateUrl: string) => {
    const response = await fetch(templateUrl);
    const blob = await response.blob();
    const file = new File([blob], 'template.jpg', { type: 'image/jpeg' });
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setShowTemplates(false);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
    }
  }, []);

  const updateCanvas = () => {
    if (!canvasRef.current || !preview) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
  
    const img = document.createElement('img');
    img.onload = () => {
      canvasRef.current!.width = img.width;
      canvasRef.current!.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      ctx.font = `bold ${metadata.textOverlay.fontSize}px Impact`;
      ctx.fillStyle = metadata.textOverlay.color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      
      if (metadata.textOverlay.topText) {
        ctx.strokeText(metadata.textOverlay.topText, img.width/2, 200);
        ctx.fillText(metadata.textOverlay.topText, img.width/2, 200);
      }
      
      if (metadata.textOverlay.bottomText) {
        ctx.strokeText(metadata.textOverlay.bottomText, img.width/2, img.height - 30);
        ctx.fillText(metadata.textOverlay.bottomText, img.width/2, img.height - 30);
      }
    };
    img.src = preview;
  };

  useEffect(() => {
    updateCanvas();
  }, [preview, metadata.textOverlay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !contract) return;
    if (!signer) {
      alert("Please connect your wallet to upload memes");
      return;
    }

    try {
      setIsUploading(true);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => 
        canvasRef.current!.toBlob((blob) => resolve(blob as Blob))
      );
      
      // Upload image to IPFS
      const imageFile = new File([blob], 'meme.png', { type: 'image/png' });
      const ipfsHash = await uploadToIPFS(imageFile);
      
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
      setMetadata({ 
        title: '', 
        description: '', 
        tags: '',
        textOverlay: {
          topText: '',
          bottomText: '',
          fontSize: '400',
          color: '#ffffff'
        }
      });
      // setTextOverlay({
      //   topText: '',
      //   bottomText: '',
      //   fontSize: '40',
      //   color: '#ffffff'
      // });
      
    } catch (error) {
      console.error('Error creating meme:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Create New Meme</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div 
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
          >
            {preview ? (
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
              />
            ) : (
              <div className="space-y-4">
                <p>Drag and drop an image or</p>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Choose Template
                </button>
              </div>
            )}
          </div>

          {showTemplates && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Choose Template</h3>
                  <button onClick={() => setShowTemplates(false)}>✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {MEME_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => handleTemplateSelect(template.url)}
                      className="text-left p-2 hover:bg-gray-100 rounded"
                    >
                      <Image
                        src={template.url}
                        alt={template.name}
                        width={200}
                        height={200}
                        className="rounded"
                      />
                      <p className="mt-2">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        {preview && (
          <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-4">Text Options</h3>
            <input
              type="text"
              placeholder="Enter top text"
              value={metadata.textOverlay.topText}
              onChange={(e) => setMetadata({
                ...metadata,
                textOverlay: { ...metadata.textOverlay, topText: e.target.value }
              })}
              className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
            />
            <input
              type="text"
              placeholder="Enter bottom text"
              value={metadata.textOverlay.bottomText}
              onChange={(e) => setMetadata({
                ...metadata,
                textOverlay: { ...metadata.textOverlay, bottomText: e.target.value }
              })}
              className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">Font Size</label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={metadata.textOverlay.fontSize}
                  onChange={(e) => setMetadata({
                    ...metadata,
                    textOverlay: { ...metadata.textOverlay, fontSize: e.target.value }
                  })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Text Color</label>
                <input
                  type="color"
                  value={metadata.textOverlay.color}
                  onChange={(e) => setMetadata({
                    ...metadata,
                    textOverlay: { ...metadata.textOverlay, color: e.target.value }
                  })}
                  className="w-full p-2 h-10 border rounded bg-gray-700"
                />
              </div>
            </div>
          </div>
)}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={metadata.title}
            onChange={(e) => setMetadata({...metadata, title: e.target.value})}
            className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
          />

          <textarea
            placeholder="Description"
            value={metadata.description}
            onChange={(e) => setMetadata({...metadata, description: e.target.value})}
            className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400 h-24"
          />

          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={metadata.tags}
            onChange={(e) => setMetadata({...metadata, tags: e.target.value})}
            className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={isUploading || !preview}
            className="w-full bg-blue-500 text-white p-3 rounded disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Mint Meme'}
          </button>
        </form>
      </div>
    </div>
  );
}