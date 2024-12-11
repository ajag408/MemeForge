// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IGasBack {
    function withdraw(
        uint256 _tokenId,
        address payable _recipient,
        uint256 _amount
    ) external returns (uint256);
}

contract MemeForge is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
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
        uint256 originalMemeId;  // if it's a remix
        uint256 timestamp;
    }

    // Mapping to track meme data
    mapping(uint256 => MemeData) public memes;

    address public gasBackContract;
    uint256 public gasBackTokenId;
    uint256 public lastWithdrawalTimestamp;
    uint256 public constant WITHDRAWAL_INTERVAL = 30 days;
    uint256 public undistributedGasBack;
    mapping(address => uint256) public creatorRewards;
    mapping(address => uint256) public remixerRewards;

    struct TransactionData {
        address creator;
        address remixer;
        uint256 gasUsed;
        bool isRemix;
    }

    // Track transactions and gas usage
    mapping(uint256 => TransactionData) public memeTransactions;
    mapping(uint256 => TransactionData) public likeTransactions;
    mapping(uint256 => TransactionData) public voteTransactions;

    // Events
    event MemeCreated(uint256 indexed tokenId, address creator);
    event MemeLiked(uint256 indexed tokenId, address liker);
    event MemeRemixed(uint256 indexed originalTokenId, uint256 indexed newTokenId, address remixer, string uri);
    event MemeVoted(uint256 indexed tokenId, address voter);
    event GasBackWithdrawn(uint256 amount, uint256 timestamp);
    event RewardsDistributed(uint256 amount, uint256 timestamp);
    event RewardsWithdrawn(address indexed user, uint256 amount);

    constructor() ERC721("MemeForge", "MEME") Ownable(msg.sender) {}


    // Minting functions
    function createMeme(string memory uri) public nonReentrant returns (uint256) {
        require(bytes(uri).length > 0 && bytes(uri).length <= 512, "Invalid URI length");

        uint256 gasStart = gasleft();  // Track starting gas
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

            // Store transaction data with gas used
        memeTransactions[tokenId] = TransactionData({
            creator: msg.sender,
            remixer: address(0),
            gasUsed: gasStart - gasleft(),  // Calculate gas used
            isRemix: false
        });

        emit MemeCreated(tokenId, msg.sender);
        return tokenId;
    }

    // Remix functionality
    function remixMeme(uint256 originalTokenId, string memory newTokenURI) public nonReentrant returns (uint256) {
        require(ownerOf(originalTokenId) != address(0), "Original meme does not exist");

        uint256 gasStart = gasleft();
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

        // Store transaction data with gas used
        memeTransactions[tokenId] = TransactionData({
            creator: memes[originalTokenId].creator,
            remixer: msg.sender,
            gasUsed: gasStart - gasleft(),
            isRemix: true
        });

        emit MemeRemixed(originalTokenId, tokenId, msg.sender, newTokenURI);
        return tokenId;
    }


    // Popularity metrics
    function likeMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(!hasLiked[msg.sender][tokenId], "Already liked this meme");

        uint256 gasStart = gasleft();

        hasLiked[msg.sender][tokenId] = true;
        memes[tokenId].likes++;

        // Store like transaction data
        likeTransactions[tokenId] = TransactionData({
            creator: memes[tokenId].creator,
            remixer: memes[tokenId].isRemix ? msg.sender : address(0),
            gasUsed: gasStart - gasleft(),
            isRemix: memes[tokenId].isRemix
        });
        emit MemeLiked(tokenId, msg.sender);
    }

    // DAO voting
    function voteMeme(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) != address(0), "Meme does not exist");
        require(balanceOf(msg.sender) > 0, "Must hold a Meme NFT to vote");
        require(!hasVoted[msg.sender][tokenId], "Already voted on this meme");

        uint256 gasStart = gasleft();

        hasVoted[msg.sender][tokenId] = true;
        memes[tokenId].votes++;

        // Store vote transaction data
        voteTransactions[tokenId] = TransactionData({
            creator: memes[tokenId].creator,
            remixer: memes[tokenId].isRemix ? msg.sender : address(0),
            gasUsed: gasStart - gasleft(),
            isRemix: memes[tokenId].isRemix
        });

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

    // Set GasBack contract address (onlyOwner)
    function setGasBackContract(address _gasBackContract) external onlyOwner {
        gasBackContract = _gasBackContract;
    }

    // Set the NFT token ID once received (onlyOwner)
    function setGasBackTokenId(uint256 _tokenId) external onlyOwner {
        gasBackTokenId = _tokenId;
    }

    // Monthly withdrawal function
    function withdrawGasBack(uint256 _amount) external onlyOwner {
        require(block.timestamp >= lastWithdrawalTimestamp + WITHDRAWAL_INTERVAL, "Too early to withdraw");
        require(gasBackContract != address(0), "GasBack contract not set");
        require(gasBackTokenId != 0, "GasBack token ID not set");
        
        // Call withdraw on GasBack contract with this contract as recipient
        uint256 receivedAmount = IGasBack(gasBackContract).withdraw(
            gasBackTokenId,
            payable(address(this)),
            _amount
        );
        
        require(receivedAmount > 0, "No ETH received");
        
        undistributedGasBack += receivedAmount;
        lastWithdrawalTimestamp = block.timestamp;
        
        // Emit event for tracking
        emit GasBackWithdrawn(receivedAmount, block.timestamp);
    }

    // Distribution functions
    function distributeGasBackRewards() external onlyOwner {
        uint256 totalAmount = undistributedGasBack;
        require(totalAmount > 0, "No rewards to distribute");
        
        undistributedGasBack = 0;
        
        _distributeCreatorRemixerShares(totalAmount);
        _distributeTopVotedBonus(totalAmount);
        
        uint256 remaining = address(this).balance;
        (bool success, ) = owner().call{value: remaining}("");
        require(success, "Failed to send to owner");
        
        emit RewardsDistributed(totalAmount, block.timestamp);
    }

    function _distributeCreatorRemixerShares(uint256 totalAmount) internal {
        // First calculate total gas used across all transactions
        uint256 totalGasUsed = 0;
        
        // Sum gas from mint/remix transactions
        for (uint256 id = 0; id < _nextTokenId; id++) {
            totalGasUsed += memeTransactions[id].gasUsed;
        }
        
        // Sum gas from like transactions
        for (uint256 id = 0; id < _nextTokenId; id++) {
            totalGasUsed += likeTransactions[id].gasUsed;
        }
        
        // Sum gas from vote transactions
        for (uint256 id = 0; id < _nextTokenId; id++) {
            totalGasUsed += voteTransactions[id].gasUsed;
        }
        
        require(totalGasUsed > 0, "No gas usage recorded");
        // Distribution logic for mints (40% creator)
        for (uint256 id = 0; id < _nextTokenId; id++) {
            TransactionData memory txData = memeTransactions[id];
            if (txData.gasUsed > 0) {
                uint256 share = (totalAmount * txData.gasUsed * 40) / (totalGasUsed * 100);
                creatorRewards[txData.creator] += share;
                
                if (txData.isRemix) {
                    uint256 remixerShare = (totalAmount * txData.gasUsed * 20) / (totalGasUsed * 100);
                    remixerRewards[txData.remixer] += remixerShare;
                }
            }
        }
        
        // Distribution logic for likes
        for (uint256 id = 0; id < _nextTokenId; id++) {
            TransactionData memory txData = likeTransactions[id];
            if (txData.gasUsed > 0) {
                uint256 creatorShare = (totalAmount * txData.gasUsed * 40) / (totalGasUsed * 100);
                creatorRewards[txData.creator] += creatorShare;
                
                if (txData.isRemix) {
                    uint256 remixerShare = (totalAmount * txData.gasUsed * 15) / (totalGasUsed * 100);
                    remixerRewards[txData.remixer] += remixerShare;
                }
            }
        }
        
        // Distribution logic for votes
        for (uint256 id = 0; id < _nextTokenId; id++) {
            TransactionData memory txData = voteTransactions[id];
            if (txData.gasUsed > 0) {
                uint256 creatorShare = txData.isRemix ? 
                    (totalAmount * txData.gasUsed * 35) / (totalGasUsed * 100) :
                    (totalAmount * txData.gasUsed * 40) / (totalGasUsed * 100);
                creatorRewards[txData.creator] += creatorShare;
                
                if (txData.isRemix) {
                    uint256 remixerShare = (totalAmount * txData.gasUsed * 15) / (totalGasUsed * 100);
                    remixerRewards[txData.remixer] += remixerShare;
                }
            }
        }
    }

    function _distributeTopVotedBonus(uint256 totalAmount) internal {
        uint256 highestVotes = 0;
        address topCreator;
        
        for (uint256 id = 0; id < _nextTokenId; id++) {
            if (memes[id].votes > highestVotes) {
                highestVotes = memes[id].votes;
                topCreator = memes[id].creator;
            }
        }
        
        if (topCreator != address(0)) {
            uint256 bonusAmount = (totalAmount * 20) / 100;
            creatorRewards[topCreator] += bonusAmount;
        }
    }

    function withdrawRewards() external nonReentrant {
        uint256 amount = creatorRewards[msg.sender] + remixerRewards[msg.sender];
        require(amount > 0, "No rewards to withdraw");
        
        creatorRewards[msg.sender] = 0;
        remixerRewards[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to send rewards");
        
        emit RewardsWithdrawn(msg.sender, amount);
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
}