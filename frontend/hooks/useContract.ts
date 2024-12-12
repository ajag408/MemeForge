"use client";

import { ethers } from 'ethers';
import MemeForgeContract from '../contracts/MemeForgeCore.json';
import { useState, useEffect } from 'react';
import { isClient } from '@/utils/isClient';
const REQUIRED_CHAIN_ID = 11011;

export function useMemeForgeContract() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const switchNetwork = async () => {
    try {
      if (!isClient || !window.ethereum) return;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
    }
  };
  // Initialize contract once with window.ethereum provider
  useEffect(() => {
    if (!isClient || typeof window === 'undefined' || !window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_MEMEFORGE_ADDRESS!,
      MemeForgeContract.abi,
      provider
    );
    setContract(contract);
    console.log("Initialized contract with provider");
  }, []);

// Update contract when signer changes
useEffect(() => {
    if (!contract || !signer) return;
    
    const connectedContract = contract.connect(signer);
    setContract(connectedContract);
    console.log("Contract connected with signer");
    }, [signer]);

  const connect = async () => {
    try {
      if (!isClient || typeof window === 'undefined' || !window.ethereum) return null;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const network = await provider.getNetwork();
      if (network.chainId !== REQUIRED_CHAIN_ID) {
        setIsWrongNetwork(true);
        await switchNetwork();
        return null;
      }
      
      setIsWrongNetwork(false);
      const signer = provider.getSigner();
      setSigner(signer);
      return signer;
    } catch (error) {
      console.error('Error connecting:', error);
      return null;
    }
  };

  const disconnect = () => {
    setSigner(null);
    // Reinitialize with provider
    if (isClient && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const newContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MEMEFORGE_ADDRESS!,
        MemeForgeContract.abi,
        provider
      );
      setContract(newContract);
    }
  };
  

  return { contract, signer, isWrongNetwork, switchNetwork, connect, disconnect };
}