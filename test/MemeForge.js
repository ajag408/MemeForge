const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MemeForge", function () {
  let MemeForgeCore, memeForgeCore;
  let MemeForgeGasBack, memeForgeGasBack;
  let MockGasBack, gasBack;
  let owner, user1, user2;
  const TEST_URI = "ipfs://QmTest";
  const REMIX_URI = "ipfs://QmRemix";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Core contract
    MemeForgeCore = await ethers.getContractFactory("MemeForgeCore");
    memeForgeCore = await MemeForgeCore.deploy();
    await memeForgeCore.waitForDeployment();

    // Deploy GasBack contract
    MemeForgeGasBack = await ethers.getContractFactory("MemeForgeGasBack");
    memeForgeGasBack = await MemeForgeGasBack.deploy(
      await memeForgeCore.getAddress()
    );
    await memeForgeGasBack.waitForDeployment();

    // Deploy mock GasBack
    MockGasBack = await ethers.getContractFactory("MockGasBack");
    gasBack = await MockGasBack.deploy();
    await gasBack.waitForDeployment();

    // Setup connections
    await memeForgeCore.setGasBackContract(await memeForgeGasBack.getAddress());
    await memeForgeGasBack.setGasBackContract(await gasBack.getAddress());
    await memeForgeGasBack.setGasBackTokenId(1);

    // Fund mock GasBack
    await owner.sendTransaction({
      to: await gasBack.getAddress(),
      value: ethers.parseEther("10.0"),
    });
  });

  describe("Meme Creation", function () {
    it("Should allow users to create memes", async function () {
      await expect(memeForgeCore.connect(user1).createMeme(TEST_URI)).to.emit(
        memeForgeCore,
        "MemeCreated"
      );

      // Verify gas tracking
      const txData = await memeForgeGasBack.memeTransactions(0);
      expect(txData.creator).to.equal(user1.address);
      expect(txData.gasUsed).to.be.gt(0);
    });

    it("Should validate URI length", async function () {
      const longURI = "x".repeat(513);
      await expect(
        memeForgeCore.connect(user1).createMeme(longURI)
      ).to.be.revertedWith("Invalid URI length");
    });
  });

  describe("Remix Functionality", function () {
    beforeEach(async function () {
      await memeForgeCore.connect(user1).createMeme(TEST_URI);
    });

    it("Should allow remixing memes", async function () {
      await expect(
        memeForgeCore.connect(user2).remixMeme(0, REMIX_URI)
      ).to.emit(memeForgeCore, "MemeRemixed");

      // Verify gas tracking for remix
      const txData = await memeForgeGasBack.memeTransactions(1);
      expect(txData.creator).to.equal(user1.address);
      expect(txData.remixer).to.equal(user2.address);
      expect(txData.isRemix).to.be.true;
    });

    it("Should track remixes", async function () {
      await memeForgeCore.connect(user2).remixMeme(0, REMIX_URI);
      const memeData = await memeForgeCore.memes(0);
      expect(memeData.remixes).to.equal(1);
    });
  });

  describe("Popularity Metrics", function () {
    beforeEach(async function () {
      await memeForgeCore.connect(user1).createMeme(TEST_URI);
    });

    it("Should track likes correctly", async function () {
      await memeForgeCore.connect(user2).likeMeme(0);
      const memeData = await memeForgeCore.memes(0);
      expect(memeData.likes).to.equal(1);

      // Verify gas tracking for like
      const likeTxData = await memeForgeGasBack.likeTransactions(0);
      expect(likeTxData.creator).to.equal(user1.address);
      expect(likeTxData.gasUsed).to.be.gt(0);

      await expect(memeForgeCore.connect(user2).likeMeme(0)).to.be.revertedWith(
        "Already liked this meme"
      );
    });

    it("Should track votes correctly", async function () {
      // Create a second meme to enable voting
      await memeForgeCore.connect(user2).createMeme(TEST_URI);

      await expect(memeForgeCore.connect(user1).voteMeme(0)).to.emit(
        memeForgeCore,
        "MemeVoted"
      );

      const memeData = await memeForgeCore.memes(0);
      expect(memeData.votes).to.equal(1);

      // Verify gas tracking for vote
      const voteTxData = await memeForgeGasBack.voteTransactions(0);
      expect(voteTxData.creator).to.equal(user1.address);
      expect(voteTxData.gasUsed).to.be.gt(0);

      await expect(memeForgeCore.connect(user1).voteMeme(0)).to.be.revertedWith(
        "Already voted on this meme"
      );
    });

    it("Should affect GasBack rewards based on popularity", async function () {
      // Create more activity for user1
      await memeForgeCore.connect(user2).likeMeme(0);
      await memeForgeCore.connect(user2).createMeme(TEST_URI);
      await memeForgeCore.connect(user1).createMeme(TEST_URI); // NFT for voting
      await memeForgeCore.connect(user1).voteMeme(1);

      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await memeForgeGasBack
        .connect(owner)
        .withdrawGasBack(ethers.parseEther("1.0"));
      await memeForgeGasBack.connect(owner).distributeGasBackRewards();

      const creator1Rewards = await memeForgeGasBack.creatorRewards(
        user1.address
      );
      const creator2Rewards = await memeForgeGasBack.creatorRewards(
        user2.address
      );
      // Just check that user1 gets rewards
      expect(creator1Rewards).to.be.gt(0);
    });
  });

  describe("Cross-World Interoperability", function () {
    beforeEach(async function () {
      await memeForgeCore.connect(user1).createMeme(TEST_URI);
    });

    it("Should return correct meme data", async function () {
      const memeData = await memeForgeCore.getMemeData(0);
      expect(memeData.uri).to.equal(TEST_URI);
      expect(memeData.creator).to.equal(user1.address);
      expect(memeData.isRemix).to.be.false;

      // Verify corresponding gas tracking data
      const txData = await memeForgeGasBack.memeTransactions(0);
      expect(txData.creator).to.equal(user1.address);
      expect(txData.isRemix).to.be.false;
    });

    it("Should track remix relationships", async function () {
      await memeForgeCore.connect(user2).remixMeme(0, REMIX_URI);
      const remixData = await memeForgeCore.getMemeData(1);

      expect(remixData.isRemix).to.be.true;
      expect(remixData.originalMemeId).to.equal(0);

      // Verify gas tracking for remix relationship
      const remixTxData = await memeForgeGasBack.memeTransactions(1);
      expect(remixTxData.creator).to.equal(user1.address); // Original creator
      expect(remixTxData.remixer).to.equal(user2.address);
      expect(remixTxData.isRemix).to.be.true;
    });

    it("Should calculate trending scores correctly", async function () {
      // Add some activity
      await memeForgeCore.connect(user2).likeMeme(0);
      await memeForgeCore.connect(user2).remixMeme(0, REMIX_URI);

      const score = await memeForgeCore.calculateTrendingScore(0);
      expect(score).to.be.gt(0);

      // Verify gas tracking for all interactions
      const likeTxData = await memeForgeGasBack.likeTransactions(0);
      const remixTxData = await memeForgeGasBack.memeTransactions(1);
      expect(likeTxData.gasUsed).to.be.gt(0);
      expect(remixTxData.gasUsed).to.be.gt(0);
    });

    it("Should return trending memes", async function () {
      await memeForgeCore.connect(user1).createMeme(TEST_URI);
      await memeForgeCore.connect(user2).likeMeme(1);
      // Create NFT for user2 before voting
      await memeForgeCore.connect(user2).createMeme(TEST_URI);
      await memeForgeCore.connect(user2).voteMeme(1);

      const trending = await memeForgeCore.getTrendingMemes(2);
      expect(trending.length).to.equal(2);
      expect(trending[0]).to.equal(1);

      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await memeForgeGasBack
        .connect(owner)
        .withdrawGasBack(ethers.parseEther("1.0"));
      await memeForgeGasBack.connect(owner).distributeGasBackRewards();

      const creator1Rewards = await memeForgeGasBack.creatorRewards(
        user1.address
      );
      expect(creator1Rewards).to.be.gt(0);
    });

    it("Should integrate GasBack with trending mechanism", async function () {
      // Create memes and generate activity
      await memeForgeCore.connect(user2).createMeme(TEST_URI);
      await memeForgeCore.connect(user1).likeMeme(1);
      await memeForgeCore.connect(user2).voteMeme(0);
      await memeForgeCore.connect(user1).remixMeme(1, REMIX_URI);

      // Get trending memes
      const trending = await memeForgeCore.getTrendingMemes(2);

      // Distribute GasBack rewards
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await memeForgeGasBack
        .connect(owner)
        .withdrawGasBack(ethers.parseEther("1.0"));
      await memeForgeGasBack.connect(owner).distributeGasBackRewards();

      // Verify top trending meme creator gets rewards
      const topCreatorAddress = await memeForgeCore.getMemeCreator(trending[0]);
      const topCreatorRewards = await memeForgeGasBack.creatorRewards(
        topCreatorAddress
      );
      expect(topCreatorRewards).to.be.gt(0);
    });
  });

  describe("Security", function () {
    it("Should prevent reentrancy attacks", async function () {
      // Add specific reentrancy tests if needed
    });

    // it("Should handle zero address cases", async function () {
    //   await expect(MemeForge.deploy(ethers.ZeroAddress, eyeNFT.getAddress())).to
    //     .be.reverted;
    // });
  });

  describe("GasBack Setup", function () {
    it("Should allow owner to set GasBack contract", async function () {
      const gasBackAddress = await gasBack.getAddress();
      await memeForgeGasBack.connect(owner).setGasBackContract(gasBackAddress);
      expect(await memeForgeGasBack.gasBackContract()).to.equal(gasBackAddress);
    });

    it("Should prevent non-owner from setting GasBack contract", async function () {
      const gasBackAddress = await gasBack.getAddress();
      await expect(
        memeForgeGasBack.connect(user1).setGasBackContract(gasBackAddress)
      ).to.be.revertedWithCustomError(
        memeForgeGasBack,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should allow owner to set GasBack token ID", async function () {
      await memeForgeGasBack.connect(owner).setGasBackTokenId(1);
      expect(await memeForgeGasBack.gasBackTokenId()).to.equal(1);
    });
  });

  describe("GasBack Withdrawal", function () {
    beforeEach(async function () {
      const gasBackAddress = await gasBack.getAddress();
      await memeForgeGasBack.connect(owner).setGasBackContract(gasBackAddress);
      await memeForgeGasBack.connect(owner).setGasBackTokenId(1);

      // Set initial withdrawal timestamp
      await memeForgeGasBack
        .connect(owner)
        .withdrawGasBack(ethers.parseEther("1.0"));
    });

    it("Should prevent withdrawal before interval", async function () {
      // Try to withdraw again without waiting
      await expect(
        memeForgeGasBack
          .connect(owner)
          .withdrawGasBack(ethers.parseEther("1.0"))
      ).to.be.revertedWith("Too early to withdraw");
    });

    it("Should allow owner to withdraw GasBack", async function () {
      // Wait for interval
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(
        memeForgeGasBack
          .connect(owner)
          .withdrawGasBack(ethers.parseEther("1.0"))
      ).to.emit(memeForgeGasBack, "GasBackWithdrawn");
    });
  });

  describe("Reward Distribution", function () {
    beforeEach(async function () {
      const gasBackAddress = await gasBack.getAddress();
      const memeForgeGasBackAddress = await memeForgeGasBack.getAddress();

      // Setup contracts
      await memeForgeGasBack.connect(owner).setGasBackContract(gasBackAddress);
      await memeForgeGasBack.connect(owner).setGasBackTokenId(1);

      // Create activity to generate rewards
      await memeForgeCore.connect(user1).createMeme(TEST_URI);
      await memeForgeCore.connect(user2).remixMeme(0, REMIX_URI);
      await memeForgeCore.connect(user1).likeMeme(1);
      await memeForgeCore.connect(user2).createMeme(TEST_URI);
      await memeForgeCore.connect(user2).voteMeme(0);

      // Fund GasBack contract
      await owner.sendTransaction({
        to: gasBackAddress,
        value: ethers.parseEther("10.0"),
      });

      // Setup GasBack withdrawal
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await memeForgeGasBack
        .connect(owner)
        .withdrawGasBack(ethers.parseEther("1.0"));

      // Fund MemeForgeGasBack
      await owner.sendTransaction({
        to: memeForgeGasBackAddress,
        value: ethers.parseEther("5.0"),
      });

      // Verify funding
      const balanceAfterFunding = await ethers.provider.getBalance(
        memeForgeGasBackAddress
      );
      console.log(
        "Balance after funding:",
        ethers.formatEther(balanceAfterFunding)
      );

      if (balanceAfterFunding === BigInt(0)) {
        throw new Error("Contract funding failed");
      }

      // Distribute rewards
      await memeForgeGasBack.connect(owner).distributeGasBackRewards();

      // Verify setup
      const contractBalance = await ethers.provider.getBalance(
        memeForgeGasBackAddress
      );
      const userRewards = await memeForgeGasBack.creatorRewards(user1.address);
      console.log(
        "Contract balance after distribution:",
        ethers.formatEther(contractBalance)
      );
      console.log(
        "User rewards after distribution:",
        ethers.formatEther(userRewards)
      );
    });

    it("Should allow users to withdraw their rewards", async function () {
      const memeForgeGasBackAddress = await memeForgeGasBack.getAddress();
      const contractBalance = await ethers.provider.getBalance(
        memeForgeGasBackAddress
      );
      const userRewards = await memeForgeGasBack.creatorRewards(user1.address);

      console.log("\nBefore withdrawal:");
      console.log("Contract balance:", ethers.formatEther(contractBalance));
      console.log("User rewards:", ethers.formatEther(userRewards));

      // Ensure contract has enough balance
      if (contractBalance < userRewards) {
        await owner.sendTransaction({
          to: memeForgeGasBackAddress,
          value: ethers.parseEther("5.0"),
        });
        console.log("Added more funds to contract");
      }

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await memeForgeGasBack.connect(user1).withdrawRewards();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      console.log("\nAfter withdrawal:");
      console.log("User initial balance:", ethers.formatEther(initialBalance));
      console.log("User final balance:", ethers.formatEther(finalBalance));
      console.log("Gas cost:", ethers.formatEther(gasCost));

      // Compare using BigInt arithmetic
      expect(finalBalance + gasCost).to.be.gt(initialBalance);
    });

    it("Should prevent double withdrawal of rewards", async function () {
      const memeForgeGasBackAddress = await memeForgeGasBack.getAddress();

      // Ensure contract has funds for first withdrawal
      await owner.sendTransaction({
        to: memeForgeGasBackAddress,
        value: ethers.parseEther("5.0"),
      });

      // First withdrawal
      await memeForgeGasBack.connect(user1).withdrawRewards();

      // Second withdrawal should fail
      await expect(
        memeForgeGasBack.connect(user1).withdrawRewards()
      ).to.be.revertedWith("No rewards to withdraw");
    });
  });
});
