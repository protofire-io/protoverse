const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const ProtoToken = await hre.ethers.getContractFactory("ProtoToken");
  const token = await ProtoToken.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("ProtoToken:", tokenAddress);

  let usdcAddress = process.env.USDC_ADDRESS || "";
  let usdcContract = null;
  if (!usdcAddress) {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    usdcContract = await MockUSDC.deploy();
    await usdcContract.waitForDeployment();
    usdcAddress = await usdcContract.getAddress();
    console.log("MockUSDC:", usdcAddress);
    await (await usdcContract.mint(deployer.address, hre.ethers.parseUnits("1000000", 6))).wait();
  } else {
    console.log("Using existing USDC:", usdcAddress);
  }

  let usdtAddress = process.env.USDT_ADDRESS || "";
  let usdtContract = null;
  if (!usdtAddress) {
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    usdtContract = await MockUSDT.deploy();
    await usdtContract.waitForDeployment();
    usdtAddress = await usdtContract.getAddress();
    console.log("MockUSDT:", usdtAddress);
    await (await usdtContract.mint(deployer.address, hre.ethers.parseUnits("1000000", 6))).wait();
  } else {
    console.log("Using existing USDT:", usdtAddress);
  }

  const ProtoTreasury = await hre.ethers.getContractFactory("ProtoTreasury");
  const treasury = await ProtoTreasury.deploy(
    tokenAddress,
    deployer.address,
    usdcAddress,
    usdtAddress,
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("ProtoTreasury:", treasuryAddress);

  await (await token.setMinter(treasuryAddress)).wait();
  console.log("Minter set to treasury");

  // Item shop (PROTO-only payments)
  const ProtoItems = await hre.ethers.getContractFactory("ProtoItems");
  const items = await ProtoItems.deploy(deployer.address);
  await items.waitForDeployment();
  const itemsAddress = await items.getAddress();
  console.log("ProtoItems:", itemsAddress);

  const ProtoShop = await hre.ethers.getContractFactory("ProtoShop");
  const shop = await ProtoShop.deploy(tokenAddress, itemsAddress, deployer.address);
  await shop.waitForDeployment();
  const shopAddress = await shop.getAddress();
  console.log("ProtoShop:", shopAddress);

  await (await items.setMinter(shopAddress)).wait();
  console.log("Items minter set to shop");

  const starterItems = [
    // Proto partner titles
    {
      game: 'MARVEL SNAP',
      price: hre.ethers.parseEther('18'),
      name: 'WEBLAUNCH Bundle',
      uri: 'ipfs://proto/games/marvel-snap/weblaunch-bundle.json',
    },
    {
      game: 'MARVEL SNAP',
      price: hre.ethers.parseEther('40'),
      name: 'Season Pass Boost',
      uri: 'ipfs://proto/games/marvel-snap/season-pass-boost.json',
    },
    // Mytona × Proto
    {
      game: 'Cooking Diary',
      price: hre.ethers.parseEther('12'),
      name: 'Chef Starter Pack',
      uri: 'ipfs://proto/games/cooking-diary/chef-starter-pack.json',
    },
    {
      game: 'Cooking Diary',
      price: hre.ethers.parseEther('28'),
      name: 'Daily Gift Chest',
      uri: 'ipfs://proto/games/cooking-diary/daily-gift-chest.json',
    },
    {
      game: 'Seekers Notes',
      price: hre.ethers.parseEther('15'),
      name: 'Mystery Energy Pack',
      uri: 'ipfs://proto/games/seekers-notes/mystery-energy-pack.json',
    },
    {
      game: 'Seekers Notes',
      price: hre.ethers.parseEther('32'),
      name: 'Hidden Object Pass',
      uri: 'ipfs://proto/games/seekers-notes/hidden-object-pass.json',
    },
    {
      game: 'Chef & Friends',
      price: hre.ethers.parseEther('14'),
      name: 'Kitchen Crew Bundle',
      uri: 'ipfs://proto/games/chef-friends/kitchen-crew-bundle.json',
    },
    {
      game: 'Chef & Friends',
      price: hre.ethers.parseEther('26'),
      name: 'Friends Feast Pack',
      uri: 'ipfs://proto/games/chef-friends/friends-feast-pack.json',
    },
    {
      game: 'Ravenhill',
      price: hre.ethers.parseEther('16'),
      name: 'Ravenhill Case File',
      uri: 'ipfs://proto/games/ravenhill/case-file.json',
    },
    {
      game: 'Ravenhill',
      price: hre.ethers.parseEther('30'),
      name: 'Noir Detective Kit',
      uri: 'ipfs://proto/games/ravenhill/noir-detective-kit.json',
    },
    // GDAP × Proto (Philippine indie showcase)
    {
      game: 'GDAP Showcase',
      price: hre.ethers.parseEther('10'),
      name: 'Manila Indie Bundle',
      uri: 'ipfs://proto/games/gdap/manila-indie-bundle.json',
    },
    {
      game: 'GDAP Showcase',
      price: hre.ethers.parseEther('22'),
      name: 'Studio Launch Pack',
      uri: 'ipfs://proto/games/gdap/studio-launch-pack.json',
    },
    // DTI-EMB × Proto (export-ready)
    {
      game: 'DTI-EMB Export Hits',
      price: hre.ethers.parseEther('12'),
      name: 'Export Ready Pack',
      uri: 'ipfs://proto/games/dti-emb/export-ready-pack.json',
    },
    {
      game: 'DTI-EMB Export Hits',
      price: hre.ethers.parseEther('24'),
      name: 'Global Payments Kit',
      uri: 'ipfs://proto/games/dti-emb/global-payments-kit.json',
    },
    // Texas Hold'em
    {
      game: "Texas Hold'em",
      price: hre.ethers.parseEther('10'),
      name: 'Neon Card Back',
      uri: 'ipfs://proto/games/holdem/neon-card-back.json',
    },
    {
      game: "Texas Hold'em",
      price: hre.ethers.parseEther('25'),
      name: 'Gold Dealer Button',
      uri: 'ipfs://proto/games/holdem/gold-dealer-button.json',
    },
    {
      game: "Texas Hold'em",
      price: hre.ethers.parseEther('50'),
      name: 'VIP Table Theme',
      uri: 'ipfs://proto/games/holdem/vip-table-theme.json',
    },
    // Blackjack
    {
      game: 'Blackjack',
      price: hre.ethers.parseEther('12'),
      name: 'Emerald Felt',
      uri: 'ipfs://proto/games/blackjack/emerald-felt.json',
    },
    {
      game: 'Blackjack',
      price: hre.ethers.parseEther('20'),
      name: 'Chrome Chip Tray',
      uri: 'ipfs://proto/games/blackjack/chrome-chip-tray.json',
    },
    {
      game: 'Blackjack',
      price: hre.ethers.parseEther('35'),
      name: 'High-Roller Seat',
      uri: 'ipfs://proto/games/blackjack/high-roller-seat.json',
    },
    // ProtoVerse cosmetics
    {
      game: 'ProtoVerse',
      price: hre.ethers.parseEther('15'),
      name: 'Avatar Frame: Ember',
      uri: 'ipfs://proto/games/metaverse/avatar-frame-ember.json',
    },
    {
      game: 'ProtoVerse',
      price: hre.ethers.parseEther('30'),
      name: 'Lobby Banner: Neon',
      uri: 'ipfs://proto/games/metaverse/lobby-banner-neon.json',
    },
  ];
  for (const item of starterItems) {
    await (await shop.listItem(item.price, item.name, item.uri, item.game)).wait();
  }
  console.log(`Listed ${starterItems.length} shop items across games`);

  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    await deployer.sendTransaction({
      to: treasuryAddress,
      value: hre.ethers.parseEther("10"),
    });
    console.log("Seeded treasury with 10 ETH");

    const usdc =
      usdcContract || (await hre.ethers.getContractAt("MockUSDC", usdcAddress));
    await (await usdc.approve(treasuryAddress, hre.ethers.parseUnits("100000", 6))).wait();
    await (await treasury.fundUsdc(hre.ethers.parseUnits("100000", 6))).wait();
    console.log("Seeded treasury with 100,000 USDC");

    const usdt =
      usdtContract || (await hre.ethers.getContractAt("MockUSDT", usdtAddress));
    await (await usdt.approve(treasuryAddress, hre.ethers.parseUnits("100000", 6))).wait();
    await (await treasury.fundUsdt(hre.ethers.parseUnits("100000", 6))).wait();
    console.log("Seeded treasury with 100,000 USDT");
  }

  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    ProtoToken: tokenAddress,
    ProtoTreasury: treasuryAddress,
    ProtoItems: itemsAddress,
    ProtoShop: shopAddress,
    USDC: usdcAddress,
    USDT: usdtAddress,
    usdcPerProto: "1000000",
    usdtPerProto: "1000000",
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("Wrote", outFile);

  const clientFile = path.join(
    __dirname,
    "..",
    "client",
    "src",
    "contracts",
    "addresses.json",
  );
  fs.mkdirSync(path.dirname(clientFile), { recursive: true });
  fs.writeFileSync(clientFile, JSON.stringify(deployment, null, 2));
  console.log("Wrote", clientFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
