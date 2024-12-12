import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { isClient } from '@/utils/isClient';
const EYE_NFT_ADDRESS = process.env.NEXT_PUBLIC_EYE_NFT_ADDRESS;
const NFT_ABI = ["function balanceOf(address owner) view returns (uint256)"];

export function useEyeHolderStatus(address: string | undefined) {
  const [isEyeHolder, setIsEyeHolder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEyeStatus = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        if (!isClient || !window.ethereum) return;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const eyeContract = new ethers.Contract(EYE_NFT_ADDRESS!, NFT_ABI, provider);
        const balance = await eyeContract.balanceOf(address);
        setIsEyeHolder(balance > 0);
      } catch (error) {
        console.error('Error checking eye holder status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkEyeStatus();
  }, [address]);

  return { isEyeHolder, isLoading };
} 