export interface NFTContract {
    balanceOf(address: string): Promise<number>;
    ownerOf(tokenId: number): Promise<string>;
  }
  
  export interface NFTGating {
    hasKeyNFT: boolean;
    hasEyeNFT: boolean;
  }
  
  export interface EyeNFTHolder {
    address: string;
    tokenId: number;
  }