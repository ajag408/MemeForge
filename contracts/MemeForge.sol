// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol"; 
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


contract MemeForge is ERC721, ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    
    // Royalty tracking
    mapping(uint256 => address) public originalCreators;
    mapping(uint256 => uint256) public royalties;

    mapping(address => mapping(uint256 => bool)) public hasLiked;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    uint96 public constant REMIX_ROYALTY_PERCENTAGE = 1000; // 10% in basis points
    
    // Mapping to track if a meme creator wants to sponsor remixes
    mapping(uint256 => bool) public sponsoredMemes;

    struct MemeData {
        string uri;
        address creator;
        uint256 likes;
        uint256 remixes;
        uint256 votes;
        bool isRemix;
        uint256 originalMemeId;  // if it's a remix
        uint256 timestamp;
    }

    // Mapping to track meme data
    mapping(uint256 => MemeData) public memes;

    // Events
    event MemeCreated(uint256 indexed tokenId, address creator);
    event MemeLiked(uint256 indexed tokenId, address liker);
    event MemeRemixed(uint256 indexed originalTokenId, uint256 indexed newTokenId, address remixer, string uri);
    event MemeVoted(uint256 indexed tokenId, address voter);

    constructor() ERC721("MemeForge", "MEME") Ownable(msg.sender) {}


    // Minting functions
    function createMeme(string memory uri) public nonReentrant returns (uint256) {
        require(bytes(uri).length > 0 && bytes(uri).length <= 512, "Invalid URI length");

        uint256 tokenId = _nextTokenId++;
        
        // Store meme data
        memes[tokenId] = MemeData({
            uri: uri,
            creator: msg.sender,
            likes: 0,
            remixes: 0,
            votes: 0,
            isRemix: false,
            originalMemeId: 0,
            timestamp: block.timestamp
        });

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit MemeCreated(tokenId, msg.sender);
        return tokenId;
    }

    // Remix functionality
    function remixMeme(uint256 originalTokenId, string memory newTokenURI) public nonReentrant returns (uint256) {
        require(ownerOf(originalTokenId) != address(0), "Original meme does not exist");

        uint256 tokenId = _nextTokenId++;

        // Store remix data
        memes[tokenId] = MemeData({
            uri: newTokenURI,
            creator: msg.sender,
            likes: 0,
            remixes: 0,
            votes: 0,
            isRemix: true,
            originalMemeId: originalTokenId,
            timestamp: block.timestamp
        });

        memes[originalTokenId].remixes++;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, newTokenURI);


        emit MemeRemixed(originalTokenId, tokenId, msg.sender, newTokenURI);
        return tokenId;
    }


    // Enable sponsorship for your meme
    function enableRemixSponsorship(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not meme owner");
        sponsoredMemes[tokenId] = true;
    }

        // Function to create a sponsored remix
    function createSponsoredRemix(
        uint256 originalTokenId,
        string memory metadataURI,
        bytes calldata signature
    ) external {
        require(sponsoredMemes[originalTokenId], "Remix not sponsored");
        
        // Verify the signature from the original meme creator
        bytes32 messageHash = keccak256(abi.encodePacked(
            originalTokenId,
            metadataURI,
            msg.sender
        ));
        address signer = ECDSA.recover(messageHash, signature);
        require(ownerOf(originalTokenId) == signer, "Invalid signature");

        // Create the remix
        remixMeme(originalTokenId, metadataURI);
    }

    // Popularity metrics
    function likeMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(!hasLiked[msg.sender][tokenId], "Already liked this meme");

        hasLiked[msg.sender][tokenId] = true;
        memes[tokenId].likes++;
        emit MemeLiked(tokenId, msg.sender);
    }

    // DAO voting
    function voteMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(balanceOf(msg.sender) > 0, "Must hold a Meme NFT to vote");
        require(!hasVoted[msg.sender][tokenId], "Already voted on this meme");

        hasVoted[msg.sender][tokenId] = true;
        memes[tokenId].votes++;
        emit MemeVoted(tokenId, msg.sender);
    }


    // View functions for other worlds
    function getMemeData(uint256 tokenId) public view returns (MemeData memory) {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        return memes[tokenId];
    }

    function getTrendingMemes(uint256 limit) public view returns (uint256[] memory) {
        uint256 total = _nextTokenId;
        if (limit > total) limit = total;
        
        // Create array of token IDs and scores
        uint256[] memory tokenIds = new uint256[](total);
        uint256[] memory scores = new uint256[](total);
        
        // Calculate scores
        for (uint256 i = 0; i < total; i++) {
            tokenIds[i] = i;
            scores[i] = calculateTrendingScore(i);
        }
        
        // Sort by score (simple bubble sort)
        for (uint256 i = 0; i < limit; i++) {
            for (uint256 j = i + 1; j < total; j++) {
                if (scores[j] > scores[i]) {
                    // Swap scores
                    uint256 tempScore = scores[i];
                    scores[i] = scores[j];
                    scores[j] = tempScore;
                    // Swap token IDs
                    uint256 tempId = tokenIds[i];
                    tokenIds[i] = tokenIds[j];
                    tokenIds[j] = tempId;
                }
            }
        }
        
        // Return top N tokens
        uint256[] memory trending = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            trending[i] = tokenIds[i];
        }
        return trending;
    }

    function calculateTrendingScore(uint256 tokenId) public view returns (uint256) {
        MemeData memory meme = memes[tokenId];
        
        // Score = (2 * likes + 3 * remixes + votes) * recency_multiplier
        uint256 score = (2 * meme.likes + 3 * meme.remixes + meme.votes);
        
        // Recency multiplier (higher for newer memes)
        uint256 age = block.timestamp - meme.timestamp;
        uint256 recencyMultiplier = age < 1 days ? 100 :
                                   age < 7 days ? 75 :
                                   age < 30 days ? 50 : 25;
                                   
        return score * recencyMultiplier / 100;
    }
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        public 
        view 
        override 
        returns (address receiver, uint256 royaltyAmount) 
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return super.royaltyInfo(tokenId, salePrice);
    }


    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}