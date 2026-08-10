const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProtoToken + ProtoTreasury", function () {
  async function fixture() {
    const [owner, user, operator] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ProtoToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    await usdc.mint(owner.address, ethers.parseUnits("1000000", 6));
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    await usdt.mint(owner.address, ethers.parseUnits("1000000", 6));
    await usdt.mint(user.address, ethers.parseUnits("10000", 6));

    const Treasury = await ethers.getContractFactory("ProtoTreasury");
    const treasury = await Treasury.deploy(
      await token.getAddress(),
      operator.address,
      await usdc.getAddress(),
      await usdt.getAddress(),
    );
    await treasury.waitForDeployment();
    await token.setMinter(await treasury.getAddress());

    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5"),
    });

    await usdc.approve(await treasury.getAddress(), ethers.parseUnits("500000", 6));
    await treasury.fundUsdc(ethers.parseUnits("500000", 6));
    await usdt.approve(await treasury.getAddress(), ethers.parseUnits("500000", 6));
    await treasury.fundUsdt(ethers.parseUnits("500000", 6));

    return { token, treasury, usdc, usdt, owner, user, operator };
  }

  it("buys PROTO 1:1 with native", async function () {
    const { token, treasury, user } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("1") });
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1"));
  });

  it("deposits and withdraws play credits in demo mode", async function () {
    const { token, treasury, user } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("2") });
    await token
      .connect(user)
      .approve(await treasury.getAddress(), ethers.parseEther("2"));
    await treasury.connect(user).deposit(ethers.parseEther("1.5"));
    expect(await treasury.playCredits(user.address)).to.equal(
      ethers.parseEther("1.5"),
    );
    await treasury.connect(user).withdrawPlayCredits(ethers.parseEther("0.5"));
    expect(await treasury.playCredits(user.address)).to.equal(
      ethers.parseEther("1"),
    );
  });

  it("stakes and unstakes", async function () {
    const { token, treasury, user } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("1") });
    await token
      .connect(user)
      .approve(await treasury.getAddress(), ethers.parseEther("1"));
    await treasury.connect(user).stake(ethers.parseEther("0.4"));
    expect(await treasury.staked(user.address)).to.equal(ethers.parseEther("0.4"));
    await treasury.connect(user).unstake(ethers.parseEther("0.4"));
    expect(await treasury.staked(user.address)).to.equal(0n);
  });

  it("operator can release when demoMode is off", async function () {
    const { token, treasury, user, operator, owner } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("1") });
    await token
      .connect(user)
      .approve(await treasury.getAddress(), ethers.parseEther("1"));
    await treasury.connect(user).deposit(ethers.parseEther("1"));
    await treasury.connect(owner).setDemoMode(false);
    await expect(
      treasury.connect(user).withdrawPlayCredits(ethers.parseEther("1")),
    ).to.be.revertedWith("Demo disabled; use operator release");
    await treasury
      .connect(operator)
      .release(user.address, ethers.parseEther("1"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1"));
  });

  it("swaps USDC for PROTO at 1:1", async function () {
    const { token, treasury, usdc, user } = await fixture();
    const usdcIn = ethers.parseUnits("25", 6);
    await usdc.connect(user).approve(await treasury.getAddress(), usdcIn);
    await treasury.connect(user).swapUsdcForProto(usdcIn);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("25"));
  });

  it("swaps PROTO for USDC at 1:1", async function () {
    const { token, treasury, usdc, user } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("10") });
    await token
      .connect(user)
      .approve(await treasury.getAddress(), ethers.parseEther("10"));
    const before = await usdc.balanceOf(user.address);
    await treasury.connect(user).swapProtoForUsdc(ethers.parseEther("10"));
    const after = await usdc.balanceOf(user.address);
    expect(after - before).to.equal(ethers.parseUnits("10", 6));
    expect(await token.balanceOf(user.address)).to.equal(0n);
  });

  it("swaps USDT for PROTO at 1:1", async function () {
    const { token, treasury, usdt, user } = await fixture();
    const usdtIn = ethers.parseUnits("40", 6);
    await usdt.connect(user).approve(await treasury.getAddress(), usdtIn);
    await treasury.connect(user).swapUsdtForProto(usdtIn);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("40"));
  });

  it("swaps PROTO for USDT at 1:1", async function () {
    const { token, treasury, usdt, user } = await fixture();
    await treasury.connect(user).buyProto({ value: ethers.parseEther("12") });
    await token
      .connect(user)
      .approve(await treasury.getAddress(), ethers.parseEther("12"));
    const before = await usdt.balanceOf(user.address);
    await treasury.connect(user).swapProtoForUsdt(ethers.parseEther("12"));
    const after = await usdt.balanceOf(user.address);
    expect(after - before).to.equal(ethers.parseUnits("12", 6));
    expect(await token.balanceOf(user.address)).to.equal(0n);
  });
});
