"use client";
import { createAlchemySmartAccountClient,
    alchemy, } from "@account-kit/infra";
import { createLightAccount } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { http } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { ethers } from 'ethers';
import { Chain } from 'viem';

export class SmartAccountService {
    private smartAccountClient: any = null;
    private address: string | null = null;
    public signer: ethers.Signer | null = null;

    async init() {
        try {
            const shapeSepoliaChain: Chain = {
                id: 11011,
                name: 'shapeSepolia',
                nativeCurrency: {
                    name: 'Sepolia Ether',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: {
                    default: {
                        http: [process.env.NEXT_PUBLIC_RPC_URL!]
                    },
                    alchemy: {
                        http: [process.env.NEXT_PUBLIC_RPC_URL!]
                    }
                },
                blockExplorers: {
                    default: {
                        name: 'Sepolia Explorer',
                        url: 'https://sepolia.etherscan.io'
                    }
                },
                testnet: true
            };

            const transport = alchemy({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!});
            const privateKey = generatePrivateKey();
            
            this.smartAccountClient = await createAlchemySmartAccountClient({
                transport,
                chain: shapeSepoliaChain,
                policyId: process.env.NEXT_PUBLIC_POLICY_ID,
                account: await createLightAccount({
                    signer: LocalAccountSigner.privateKeyToAccountSigner(privateKey),
                    chain: shapeSepoliaChain,
                    transport,
                }),
            });

            this.address = await this.smartAccountClient.account.address;
            
            // Create ethers provider and signer for compatibility
            const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
            this.signer = new ethers.Wallet(privateKey, provider);

            return this.smartAccountClient;
        } catch (error) {
            console.error('Failed to initialize smart account:', error);
            throw error;
        }
    }

    getAddress(): string {
        return this.address || '';
    }

    async logout() {
        this.smartAccountClient = null;
        this.address = null;
        this.signer = null;
    }

    async executeTransaction(tx: any) {
        if (!this.smartAccountClient) throw new Error('Smart account not initialized');
        
        try {
            const userOp = await this.smartAccountClient.sendUserOperation({
                uo: {
                target: tx.to,
                data: tx.data,
                value: tx.value || BigInt(0),
                }
            });
            console.log("userOp: ", userOp)
            const txHash = await userOp.waitForTxHash();
            return txHash;
        } catch (error) {
            console.error('Transaction execution failed:', error);
            throw error;
        }
    }
}


