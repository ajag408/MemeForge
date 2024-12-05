"use client";

import { ethers } from 'ethers';
import MemeForgeContract from '../contracts/MemeForge.json';
import { useState, useEffect } from 'react';

const REQUIRED_CHAIN_ID = 11011;

export function useMemeForgeContract() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');

  const switchNetwork = async () => {
    try {
      if (!window.ethereum) return;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
    }
  };

  const connect = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        console.log('MetaMask not installed');
        return;
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setIsConnected(true);
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Check network
      const network = await provider.getNetwork();
      if (network.chainId !== REQUIRED_CHAIN_ID) {
        setIsWrongNetwork(true);
        await switchNetwork();
        return;
      }
      
      setIsWrongNetwork(false);
      const signer = provider.getSigner();
      setSigner(signer);

      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MEMEFORGE_ADDRESS!,
        MemeForgeContract.abi,
        signer
      );
      setContract(contract);
    } catch (error: any) {
      if (error.code === 4001) {
        // User rejected request
        console.log('Please connect to MetaMask.');
      } else {
        console.error('Error initializing contract:', error);
      }
      setIsConnected(false);
    }
  };

  const disconnect = async () => {
    try {
      // Clear all states
      setContract(null);
      setSigner(null);
      setIsConnected(false);
      setIsWrongNetwork(false);
      setAddress('');

      // Remove the cached provider
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{
            eth_accounts: {}
          }]
        });
      }

      // Clear any stored connection data
      localStorage.removeItem('walletconnect');
      localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
      
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  useEffect(() => {
    // Check if already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connect();
          }
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setContract(null);
          setSigner(null);
        } else {
          connect();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      // Cleanup listeners
      return () => {
        if (!window.ethereum) return;
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      };
    }
  }, []);

  return { 
    contract, 
    signer, 
    isWrongNetwork, 
    switchNetwork, 
    connect, 
    disconnect,
    isConnected,
    address 
  };
}