// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol"; 
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract MemeForge is ERC721, ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    // External NFT contract interfaces
    IERC721 public keyNFT;
    IERC721 public eyeNFT;

    // Popularity metrics
    mapping(uint256 => uint256) public likes;
    mapping(uint256 => uint256) public remixes;
    mapping(uint256 => uint256) public votes;
    
    // Royalty tracking
    mapping(uint256 => address) public originalCreators;
    mapping(uint256 => uint256) public royalties;

    mapping(address => mapping(uint256 => bool)) public hasLiked;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    uint96 public constant REMIX_ROYALTY_PERCENTAGE = 1000; // 10% in basis points


    // Events
    event MemeCreated(uint256 indexed tokenId, address creator);
    event MemeLiked(uint256 indexed tokenId, address liker);
    event MemeRemixed(uint256 indexed originalTokenId, uint256 indexed newTokenId);
    event MemeVoted(uint256 indexed tokenId, address voter);

    constructor(address _keyNFT, address _eyeNFT) ERC721("MemeForge", "MEME") Ownable(msg.sender) {
        keyNFT = IERC721(_keyNFT);
        eyeNFT = IERC721(_eyeNFT);
    }

    // NFT Holder checks
    function isKeyHolder(address user) public view returns (bool) {
        return keyNFT.balanceOf(user) > 0;
    }

    function isEyeHolder(address user) public view returns (bool) {
        return eyeNFT.balanceOf(user) > 0;
    }

    // Minting functions
    function createMeme(string memory uri) public nonReentrant returns (uint256) {
        require(isKeyHolder(msg.sender), "Must hold a Key NFT to create memes");
        require(bytes(uri).length > 0 && bytes(uri).length <= 512, "Invalid URI length");

        uint256 tokenId = _nextTokenId++;
        
        originalCreators[tokenId] = msg.sender;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit MemeCreated(tokenId, msg.sender);
        return tokenId;
    }

    // Remix functionality
    function remixMeme(uint256 originalTokenId, string memory newTokenURI) public nonReentrant returns (uint256) {
        require(ownerOf(originalTokenId) != address(0), "Original meme does not exist");
        require(isEyeHolder(msg.sender), "Must hold an Eye NFT to remix memes");

        uint256 tokenId = _nextTokenId++;

        remixes[originalTokenId]++;
        royalties[originalTokenId]++;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, newTokenURI);

        // Set royalties for original creator
        _setTokenRoyalty(tokenId, ownerOf(originalTokenId), REMIX_ROYALTY_PERCENTAGE);


        emit MemeRemixed(originalTokenId, tokenId);
        return tokenId;
    }

    // Popularity metrics
    function likeMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(!hasLiked[msg.sender][tokenId], "Already liked this meme");

        hasLiked[msg.sender][tokenId] = true;
        likes[tokenId]++;
        emit MemeLiked(tokenId, msg.sender);
    }

    // DAO voting
    function voteMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(balanceOf(msg.sender) > 0, "Must hold a Meme NFT to vote");
        require(!hasVoted[msg.sender][tokenId], "Already voted on this meme");

        hasVoted[msg.sender][tokenId] = true;
        votes[tokenId]++;
        emit MemeVoted(tokenId, msg.sender);
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

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}