import { useState, useEffect } from 'react';
import { useContract } from '@/contexts/ContractContext';
import { ethers } from 'ethers';
import type { NFTGating } from '@/types/nft';
import { useSmartAccount } from '@/contexts/SmartAccountContext';

const KEY_NFT_ADDRESS = process.env.NEXT_PUBLIC_KEY_NFT_ADDRESS;
const EYE_NFT_ADDRESS = process.env.NEXT_PUBLIC_EYE_NFT_ADDRESS;
const NFT_ABI = ["function balanceOf(address owner) view returns (uint256)"];

export function useNFTGating() {
  const { memeForgeCore: contract, signer } = useContract();
  const { smartAccountAddress } = useSmartAccount();
  const [nftStatus, setNftStatus] = useState<NFTGating>({ 
    hasKeyNFT: false, 
    hasEyeNFT: false 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkNFTs = async () => {
      if (!contract || (!signer && !smartAccountAddress)){
        setIsLoading(false);
        return;
      }

      try {
        const address = await signer!.getAddress();
        const keyContract = new ethers.Contract(KEY_NFT_ADDRESS!, NFT_ABI, signer!);
        const eyeContract = new ethers.Contract(EYE_NFT_ADDRESS!, NFT_ABI, signer!);

        const [keyBalance, eyeBalance] = await Promise.all([
          keyContract.balanceOf(address),
          eyeContract.balanceOf(address)
        ]);

        if (isMounted) {
            setNftStatus({
              hasKeyNFT: keyBalance > 0,
              hasEyeNFT: eyeBalance > 0
            });
          }
      } catch (error) {
        console.error('Error checking NFT status:', error);
      } finally {
        if(isMounted){
            setIsLoading(false);
        }
      }
    };

    checkNFTs();

    return () => {
      isMounted = false;
    };
  }, [contract, signer, smartAccountAddress]);

  return { ...nftStatus, isLoading, signer };
}