const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MemeForge", function () {
  let MemeForge, memeForge;
  let MockNFT, keyNFT, eyeNFT;
  let owner, user1, user2;
  const TEST_URI = "ipfs://QmTest";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock NFTs
    MockNFT = await ethers.getContractFactory("MockNFT");
    keyNFT = await MockNFT.deploy("KeyNFT", "KEY");
    eyeNFT = await MockNFT.deploy("EyeNFT", "EYE");

    // Deploy MemeForge
    MemeForge = await ethers.getContractFactory("MemeForge");
    memeForge = await MemeForge.deploy(
      await keyNFT.getAddress(),
      await eyeNFT.getAddress()
    );
  });

  describe("NFT Holder Checks", function () {
    it("Should correctly identify Key NFT holders", async function () {
      expect(await memeForge.isKeyHolder(user1.address)).to.be.false;
      await keyNFT.mint(user1.address, 1);
      expect(await memeForge.isKeyHolder(user1.address)).to.be.true;
    });

    it("Should correctly identify Eye NFT holders", async function () {
      expect(await memeForge.isEyeHolder(user1.address)).to.be.false;
      await eyeNFT.mint(user1.address, 1);
      expect(await memeForge.isEyeHolder(user1.address)).to.be.true;
    });
  });

  describe("Meme Creation", function () {
    beforeEach(async function () {
      await keyNFT.mint(user1.address, 1);
    });

    it("Should allow Key holders to create memes", async function () {
      await expect(memeForge.connect(user1).createMeme(TEST_URI)).to.emit(
        memeForge,
        "MemeCreated"
      );
    });

    it("Should prevent non-Key holders from creating memes", async function () {
      await expect(
        memeForge.connect(user2).createMeme(TEST_URI)
      ).to.be.revertedWith("Must hold a Key NFT to create memes");
    });

    it("Should validate URI length", async function () {
      const longURI = "x".repeat(513);
      await expect(
        memeForge.connect(user1).createMeme(longURI)
      ).to.be.revertedWith("Invalid URI length");
    });
  });

  describe("Remix Functionality", function () {
    beforeEach(async function () {
      await keyNFT.mint(user1.address, 1);
      await eyeNFT.mint(user2.address, 1);
      await memeForge.connect(user1).createMeme(TEST_URI);
    });

    it("Should allow Eye holders to remix memes", async function () {
      await expect(memeForge.connect(user2).remixMeme(0, TEST_URI)).to.emit(
        memeForge,
        "MemeRemixed"
      );
    });

    it("Should prevent non-Eye holders from remixing", async function () {
      await expect(
        memeForge.connect(user1).remixMeme(0, TEST_URI)
      ).to.be.revertedWith("Must hold an Eye NFT to remix memes");
    });

    it("Should track remixes and royalties", async function () {
      await memeForge.connect(user2).remixMeme(0, TEST_URI);
      expect(await memeForge.remixes(0)).to.equal(1);
      expect(await memeForge.royalties(0)).to.equal(1);
    });
  });

  describe("Royalties", function () {
    beforeEach(async function () {
      await keyNFT.mint(user1.address, 1);
      await eyeNFT.mint(user2.address, 1);
      await memeForge.connect(user1).createMeme(TEST_URI);
    });

    it("Should set correct royalties for remixes", async function () {
      await memeForge.connect(user2).remixMeme(0, TEST_URI);
      const [receiver, amount] = await memeForge.royaltyInfo(1, 10000); // 100 USD example price
      expect(receiver).to.equal(user1.address); // Original creator
      expect(amount).to.equal(1000); // 10% of 10000
    });
  });

  describe("Popularity Metrics", function () {
    beforeEach(async function () {
      await keyNFT.mint(user1.address, 1);
      await memeForge.connect(user1).createMeme(TEST_URI);
    });

    it("Should track likes correctly", async function () {
      await memeForge.connect(user2).likeMeme(0);
      expect(await memeForge.likes(0)).to.equal(1);
      await expect(memeForge.connect(user2).likeMeme(0)).to.be.revertedWith(
        "Already liked this meme"
      );
    });

    it("Should track votes correctly", async function () {
      await memeForge.connect(user1).createMeme(TEST_URI); // Create a second meme to enable voting
      await expect(memeForge.connect(user1).voteMeme(0)).to.emit(
        memeForge,
        "MemeVoted"
      );
      expect(await memeForge.votes(0)).to.equal(1);
      await expect(memeForge.connect(user1).voteMeme(0)).to.be.revertedWith(
        "Already voted on this meme"
      );
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
});
