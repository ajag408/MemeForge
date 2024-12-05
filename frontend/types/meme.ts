export interface Meme {
    tokenId: number;
    uri: string;
    creator: string;
    likes: number;
    remixes: number;
    votes: number;
    isRemix: boolean;
    originalMemeId: number;
    timestamp: number;
  }
  
  export interface MemeMetadata {
    title: string;
    description: string;
    tags: string[];
    image: string;
  }