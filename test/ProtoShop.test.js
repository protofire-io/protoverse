const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProtoShop (PROTO-only)", function () {
  async function fixture() {
    const [owner, buyer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ProtoToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();
    await token.mint(buyer.address, ethers.parseEther("1000"));

    const Items = await ethers.getContractFactory("ProtoItems");
    const items = await Items.deploy(owner.address);
    await items.waitForDeployment();

    const Shop = await ethers.getContractFactory("ProtoShop");
    const shop = await Shop.deploy(
      await token.getAddress(),
      await items.getAddress(),
      owner.address,
    );
    await shop.waitForDeployment();
    await items.setMinter(await shop.getAddress());

    await shop.listItem(
      ethers.parseEther("10"),
      "Neon Card Back",
      "ipfs://proto/games/holdem/neon-card-back.json",
      "Texas Hold'em",
    );

    return { token, items, shop, owner, buyer };
  }

  it("lists an item under a video game", async function () {
    const { shop } = await fixture();
    const listing = await shop.getListing(1);
    expect(listing[0]).to.equal(ethers.parseEther("10"));
    expect(listing[1]).to.equal(true);
    expect(listing[2]).to.equal("Neon Card Back");
    expect(listing[4]).to.equal("Texas Hold'em");
  });

  it("buys item with PROTO only", async function () {
    const { token, items, shop, owner, buyer } = await fixture();
    await token
      .connect(buyer)
      .approve(await shop.getAddress(), ethers.parseEther("20"));

    const ownerBefore = await token.balanceOf(owner.address);
    await shop.connect(buyer).buy(1, 2);
    const ownerAfter = await token.balanceOf(owner.address);

    expect(ownerAfter - ownerBefore).to.equal(ethers.parseEther("20"));
    expect(await items.balanceOf(buyer.address, 1)).to.equal(2n);
  });

  it("rejects inactive listings", async function () {
    const { token, shop, buyer } = await fixture();
    await shop.updateItem(
      1,
      ethers.parseEther("10"),
      false,
      "Neon Card Back",
      "ipfs://proto/games/holdem/neon-card-back.json",
      "Texas Hold'em",
    );
    await token
      .connect(buyer)
      .approve(await shop.getAddress(), ethers.parseEther("10"));
    await expect(shop.connect(buyer).buy(1, 1)).to.be.revertedWith(
      "Item not for sale",
    );
  });
});
