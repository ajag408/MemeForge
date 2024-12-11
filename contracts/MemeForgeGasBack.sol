// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMemeForgeCore {
    function getMemeCreator(uint256 tokenId) external view returns (address);
    function isRemix(uint256 tokenId) external view returns (bool);
    function getOriginalMemeId(uint256 tokenId) external view returns (uint256);
    function getMemeVotes(uint256 tokenId) external view returns (uint256);
    function getNextTokenId() external view returns (uint256);
}

interface IGasBack {
    function withdraw(
        uint256 _tokenId,
        address payable _recipient,
        uint256 _amount
    ) external returns (uint256);
}

contract MemeForgeGasBack is Ownable, ReentrancyGuard {
    address public memeForgeCore;
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

    enum TransactionType { Mint, Like, Vote }

    // Events
    event GasBackWithdrawn(uint256 amount, uint256 timestamp);
    event RewardsDistributed(uint256 amount, uint256 timestamp);
    event RewardsWithdrawn(address indexed user, uint256 amount);

    constructor(address _memeForgeCore) Ownable(msg.sender) {
        memeForgeCore = _memeForgeCore;
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
        IMemeForgeCore core = IMemeForgeCore(memeForgeCore);
        uint256 nextTokenId = core.getNextTokenId();
        
        // First calculate total gas used across all transactions
        uint256 totalGasUsed = 0;
        
        // Sum gas from mint/remix transactions
        for (uint256 id = 0; id < nextTokenId; id++) {
            totalGasUsed += memeTransactions[id].gasUsed;
            totalGasUsed += likeTransactions[id].gasUsed;
            totalGasUsed += voteTransactions[id].gasUsed;
        }
        
        require(totalGasUsed > 0, "No gas usage recorded");

        // Distribution logic for mints (40% creator)
        for (uint256 id = 0; id < nextTokenId; id++) {
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
        for (uint256 id = 0; id < nextTokenId; id++) {
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
        for (uint256 id = 0; id < nextTokenId; id++) {
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
        IMemeForgeCore core = IMemeForgeCore(memeForgeCore);
        uint256 nextTokenId = core.getNextTokenId();
        
        uint256 highestVotes = 0;
        address topCreator;
        
        for (uint256 id = 0; id < nextTokenId; id++) {
            uint256 votes = core.getMemeVotes(id);
            if (votes > highestVotes) {
                highestVotes = votes;
                topCreator = core.getMemeCreator(id);
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

    // Function to record gas usage for transactions
    function recordTransaction(
        uint256 tokenId,
        address creator,
        address remixer,
        uint256 gasUsed,
        bool isRemix,
        TransactionType txType
    ) external {
        require(msg.sender == memeForgeCore, "Only MemeForge can record");
        
        TransactionData memory txData = TransactionData({
            creator: creator,
            remixer: remixer,
            gasUsed: gasUsed,
            isRemix: isRemix
        });

        if (txType == TransactionType.Mint) {
            memeTransactions[tokenId] = txData;
        } else if (txType == TransactionType.Like) {
            likeTransactions[tokenId] = txData;
        } else if (txType == TransactionType.Vote) {
            voteTransactions[tokenId] = txData;
        }
    }



    receive() external payable {}
}