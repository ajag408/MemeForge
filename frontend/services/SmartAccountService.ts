"use client";
import {
    createAlchemySmartAccountClient,
    sepolia,
    alchemy,
  } from "@account-kit/infra";
  import { createLightAccount } from "@account-kit/smart-contracts";
  import { LocalAccountSigner } from "@aa-sdk/core";
  import { http } from "viem";
  import { generatePrivateKey } from "viem/accounts";
import { PopulatedTransaction } from "ethers";
import { Chain } from 'viem'

  export class SmartAccountService {
    private smartAccountClient: any=null;
    private address: string | null = null;
    // Add this new getter method
    getAddress(): string {
        if (!this.address) {
            throw new Error("Smart account not initialized");
        }
        return this.address;
    }
    // with account hoisting
    async init() {
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
        // console.log("hello from sa service")
        this.smartAccountClient = createAlchemySmartAccountClient({
            transport,
            chain: shapeSepoliaChain,
            account: await createLightAccount({
                signer: LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey()),
                chain: shapeSepoliaChain,
                transport,
            }),
        });
        // console.log("smart account client: ", this.smartAccountClient)
        this.address = await this.smartAccountClient.account.address

        return this.smartAccountClient;
    }

    async executeTransaction(tx: PopulatedTransaction) {
        const signature = await this.smartAccountClient.signMessage({ message: "Hello world! " });
        return signature;
    }

}