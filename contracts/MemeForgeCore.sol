// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Add this interface at the top
interface IMemeForgeGasBack {
    function recordTransaction(
        uint256 tokenId,
        address creator,
        address remixer,
        uint256 gasUsed,
        bool isRemix,
        uint8 txType
    ) external;
}
contract MemeForgeCore is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    mapping(address => mapping(uint256 => bool)) public hasLiked;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    struct MemeData {
        string uri;
        address creator;
        uint256 likes;
        uint256 remixes;
        uint256 votes;
        bool isRemix;
        uint256 originalMemeId;
        uint256 timestamp;
    }

    // Mapping to track meme data
    mapping(uint256 => MemeData) public memes;

    //GasBack contract address
    address public gasBackContract;

    // Events
    event MemeCreated(uint256 indexed tokenId, address creator);
    event MemeLiked(uint256 indexed tokenId, address liker);
    event MemeRemixed(uint256 indexed originalTokenId, uint256 indexed newTokenId, address remixer, string uri);
    event MemeVoted(uint256 indexed tokenId, address voter);

    constructor() ERC721("MemeForge", "MEME") Ownable(msg.sender) {}

    // setter for GasBack address
    function setGasBackContract(address _gasBackContract) external onlyOwner {
        gasBackContract = _gasBackContract;
    }


    function createMeme(string memory uri) public nonReentrant returns (uint256) {
        require(bytes(uri).length > 0 && bytes(uri).length <= 512, "Invalid URI length");

        uint256 gasStart = gasleft();
        uint256 tokenId = _nextTokenId++;
        
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

        // Record gas usage if GasBack is set
        if (gasBackContract != address(0)) {
            IMemeForgeGasBack(gasBackContract).recordTransaction(
                tokenId,
                msg.sender,  // creator
                address(0),  // no remixer
                gasStart - gasleft(),  // gas used
                false,      // not a remix
                0          // Mint type
            );
        }

        emit MemeCreated(tokenId, msg.sender);
        return tokenId;
    }

    function remixMeme(uint256 originalTokenId, string memory newTokenURI) public nonReentrant returns (uint256) {
        require(ownerOf(originalTokenId) != address(0), "Original meme does not exist");

        uint256 gasStart = gasleft();
        uint256 tokenId = _nextTokenId++;
        address originalCreator = memes[originalTokenId].creator;

        memes[tokenId] = MemeData({
            uri: newTokenURI,
            creator: originalCreator,
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

        // Record gas usage if GasBack is set
        if (gasBackContract != address(0)) {
            IMemeForgeGasBack(gasBackContract).recordTransaction(
                tokenId,
                originalCreator,  // original creator
                msg.sender,      // remixer
                gasStart - gasleft(),
                true,           // is a remix
                0              // Mint type
            );
        }

        emit MemeRemixed(originalTokenId, tokenId, msg.sender, newTokenURI);
        return tokenId;
    }

    function likeMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(!hasLiked[msg.sender][tokenId], "Already liked this meme");


        uint256 gasStart = gasleft();

        hasLiked[msg.sender][tokenId] = true;
        memes[tokenId].likes++;

        // Record gas usage if GasBack is set
        if (gasBackContract != address(0)) {
            IMemeForgeGasBack(gasBackContract).recordTransaction(
                tokenId,
                memes[tokenId].creator,
                memes[tokenId].isRemix ? msg.sender : address(0),
                gasStart - gasleft(),
                memes[tokenId].isRemix,
                1  // Like type
            );
        }

        emit MemeLiked(tokenId, msg.sender);
    }

    function voteMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(balanceOf(msg.sender) > 0, "Must hold a Meme NFT to vote");
        require(!hasVoted[msg.sender][tokenId], "Already voted on this meme");


        uint256 gasStart = gasleft();

        hasVoted[msg.sender][tokenId] = true;
        memes[tokenId].votes++;

        // Record gas usage if GasBack is set
        if (gasBackContract != address(0)) {
            IMemeForgeGasBack(gasBackContract).recordTransaction(
                tokenId,
                memes[tokenId].creator,
                memes[tokenId].isRemix ? msg.sender : address(0),
                gasStart - gasleft(),
                memes[tokenId].isRemix,
                2  // Vote type
            );
        }

        emit MemeVoted(tokenId, msg.sender);
    }

    // View functions
    function getMemeData(uint256 tokenId) public view returns (MemeData memory) {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        return memes[tokenId];
    }

    function calculateTrendingScore(uint256 tokenId) public view returns (uint256) {
        MemeData memory meme = memes[tokenId];
        
        uint256 score = (2 * meme.likes + 3 * meme.remixes + meme.votes);
        
        uint256 age = block.timestamp - meme.timestamp;
        uint256 recencyMultiplier = age < 1 days ? 100 :
                                   age < 7 days ? 75 :
                                   age < 30 days ? 50 : 25;
                                   
        return score * recencyMultiplier / 100;
    }

    function getTrendingMemes(uint256 limit) public view returns (uint256[] memory) {
        uint256 total = _nextTokenId;
        if (limit > total) limit = total;
        
        uint256[] memory tokenIds = new uint256[](total);
        uint256[] memory scores = new uint256[](total);
        
        for (uint256 i = 0; i < total; i++) {
            tokenIds[i] = i;
            scores[i] = calculateTrendingScore(i);
        }
        
        for (uint256 i = 0; i < limit; i++) {
            for (uint256 j = i + 1; j < total; j++) {
                if (scores[j] > scores[i]) {
                    uint256 tempScore = scores[i];
                    scores[i] = scores[j];
                    scores[j] = tempScore;
                    uint256 tempId = tokenIds[i];
                    tokenIds[i] = tokenIds[j];
                    tokenIds[j] = tempId;
                }
            }
        }
        
        uint256[] memory trending = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            trending[i] = tokenIds[i];
        }
        return trending;
    }

    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Interface for GasBack contract
    function getMemeCreator(uint256 tokenId) external view returns (address) {
        return memes[tokenId].creator;
    }

    function isRemix(uint256 tokenId) external view returns (bool) {
        return memes[tokenId].isRemix;
    }

    function getOriginalMemeId(uint256 tokenId) external view returns (uint256) {
        return memes[tokenId].originalMemeId;
    }

    function getMemeVotes(uint256 tokenId) external view returns (uint256) {
        return memes[tokenId].votes;
    }
}