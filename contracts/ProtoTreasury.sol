// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ProtoToken.sol";

/**
 * @title ProtoTreasury
 * @notice Buy / escrow / stake / swap hub for PROTO (TILE Manager analogue).
 *
 * Flow:
 * 1) buyProto() with native POL/ETH → mint PROTO 1:1 (wei)
 * 2) buyProtoWithUsdc/Usdt / swap*ForProto → mint PROTO from stables
 * 3) deposit() → lock PROTO as play credits
 * 4) withdrawPlayCredits() in demoMode, or release() by operator
 * 5) stake() / unstake() for VIP / future governance
 * 6) swapProtoForUsdc/Usdt / swapProtoForNative() cash out
 */
contract ProtoTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ProtoToken public immutable token;
    IERC20 public usdc;
    IERC20 public usdt;

    address public operator;
    bool public demoMode = true;

    /// @notice Stable base units (6 decimals) per 1 full PROTO (1e18 wei). Default 1:1.
    uint256 public usdcPerProto = 1e6;
    uint256 public usdtPerProto = 1e6;

    mapping(address => uint256) public playCredits;
    mapping(address => uint256) public staked;

    event Bought(address indexed user, uint256 amount);
    event BoughtWithUsdc(address indexed user, uint256 protoAmount, uint256 usdcAmount);
    event BoughtWithUsdt(address indexed user, uint256 protoAmount, uint256 usdtAmount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Swapped(address indexed user, uint256 amount);
    event SwappedProtoForUsdc(address indexed user, uint256 protoAmount, uint256 usdcAmount);
    event SwappedUsdcForProto(address indexed user, uint256 usdcAmount, uint256 protoAmount);
    event SwappedProtoForUsdt(address indexed user, uint256 protoAmount, uint256 usdtAmount);
    event SwappedUsdtForProto(address indexed user, uint256 usdtAmount, uint256 protoAmount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event OperatorUpdated(address indexed operator);
    event DemoModeUpdated(bool enabled);
    event UsdcUpdated(address indexed usdc);
    event UsdtUpdated(address indexed usdt);
    event UsdcRateUpdated(uint256 usdcPerProto);
    event UsdtRateUpdated(uint256 usdtPerProto);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not operator");
        _;
    }

    constructor(
        address tokenAddress,
        address initialOperator,
        address usdcAddress,
        address usdtAddress
    ) {
        require(tokenAddress != address(0), "Invalid token");
        token = ProtoToken(tokenAddress);
        operator = initialOperator == address(0) ? msg.sender : initialOperator;
        if (usdcAddress != address(0)) {
            usdc = IERC20(usdcAddress);
        }
        if (usdtAddress != address(0)) {
            usdt = IERC20(usdtAddress);
        }
    }

    receive() external payable {}

    function setOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid operator");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function setDemoMode(bool enabled) external onlyOwner {
        demoMode = enabled;
        emit DemoModeUpdated(enabled);
    }

    function setUsdc(address usdcAddress) external onlyOwner {
        require(usdcAddress != address(0), "Invalid USDC");
        usdc = IERC20(usdcAddress);
        emit UsdcUpdated(usdcAddress);
    }

    function setUsdt(address usdtAddress) external onlyOwner {
        require(usdtAddress != address(0), "Invalid USDT");
        usdt = IERC20(usdtAddress);
        emit UsdtUpdated(usdtAddress);
    }

    function setUsdcPerProto(uint256 rate) external onlyOwner {
        require(rate > 0, "Invalid rate");
        usdcPerProto = rate;
        emit UsdcRateUpdated(rate);
    }

    function setUsdtPerProto(uint256 rate) external onlyOwner {
        require(rate > 0, "Invalid rate");
        usdtPerProto = rate;
        emit UsdtRateUpdated(rate);
    }

    function quoteProtoToUsdc(uint256 protoAmount) public view returns (uint256) {
        return (protoAmount * usdcPerProto) / 1e18;
    }

    function quoteUsdcToProto(uint256 usdcAmount) public view returns (uint256) {
        return (usdcAmount * 1e18) / usdcPerProto;
    }

    function quoteProtoToUsdt(uint256 protoAmount) public view returns (uint256) {
        return (protoAmount * usdtPerProto) / 1e18;
    }

    function quoteUsdtToProto(uint256 usdtAmount) public view returns (uint256) {
        return (usdtAmount * 1e18) / usdtPerProto;
    }

    /// @notice Buy PROTO 1:1 with native gas token (POL/ETH), like buyTile().
    function buyProto() external payable nonReentrant {
        require(msg.value > 0, "Zero value");
        token.mint(msg.sender, msg.value);
        emit Bought(msg.sender, msg.value);
    }

    /// @notice Buy PROTO with USDC at the configured rate (mints PROTO).
    function buyProtoWithUsdc(uint256 usdcAmount) external nonReentrant {
        require(address(usdc) != address(0), "USDC not set");
        require(usdcAmount > 0, "Zero amount");
        uint256 protoAmount = quoteUsdcToProto(usdcAmount);
        require(protoAmount > 0, "Amount too small");
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        token.mint(msg.sender, protoAmount);
        emit BoughtWithUsdc(msg.sender, protoAmount, usdcAmount);
        emit SwappedUsdcForProto(msg.sender, usdcAmount, protoAmount);
    }

    /// @notice Lock PROTO into play escrow.
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        playCredits[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Demo withdraw from escrow (disable in production).
    function withdrawPlayCredits(uint256 amount) external nonReentrant {
        require(demoMode, "Demo disabled; use operator release");
        require(amount > 0, "Zero amount");
        require(playCredits[msg.sender] >= amount, "Insufficient credits");
        playCredits[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Production cash-out: backend operator releases escrowed PROTO.
    function release(address user, uint256 amount) external onlyOperator nonReentrant {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Zero amount");
        require(playCredits[user] >= amount, "Insufficient credits");
        playCredits[user] -= amount;
        require(token.transfer(user, amount), "Transfer failed");
        emit Withdrawn(user, amount);
    }

    /// @notice Operator can credit escrow (e.g. sync off-chain winnings).
    function operatorCredit(address user, uint256 amount) external onlyOperator nonReentrant {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Zero amount");
        token.mint(address(this), amount);
        playCredits[user] += amount;
        emit Deposited(user, amount);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(staked[msg.sender] >= amount, "Insufficient stake");
        staked[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Swap PROTO → USDC from treasury liquidity.
    function swapProtoForUsdc(uint256 protoAmount) external nonReentrant {
        require(address(usdc) != address(0), "USDC not set");
        require(protoAmount > 0, "Zero amount");
        uint256 usdcAmount = quoteProtoToUsdc(protoAmount);
        require(usdcAmount > 0, "Amount too small");
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC liquidity");
        require(token.transferFrom(msg.sender, address(this), protoAmount), "Transfer failed");
        usdc.safeTransfer(msg.sender, usdcAmount);
        emit SwappedProtoForUsdc(msg.sender, protoAmount, usdcAmount);
    }

    /// @notice Swap USDC → PROTO (same as buyProtoWithUsdc; kept for UI clarity).
    function swapUsdcForProto(uint256 usdcAmount) external nonReentrant {
        require(address(usdc) != address(0), "USDC not set");
        require(usdcAmount > 0, "Zero amount");
        uint256 protoAmount = quoteUsdcToProto(usdcAmount);
        require(protoAmount > 0, "Amount too small");
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        token.mint(msg.sender, protoAmount);
        emit SwappedUsdcForProto(msg.sender, usdcAmount, protoAmount);
        emit BoughtWithUsdc(msg.sender, protoAmount, usdcAmount);
    }

    /// @notice Buy PROTO with USDT at the configured rate (mints PROTO).
    function buyProtoWithUsdt(uint256 usdtAmount) external nonReentrant {
        require(address(usdt) != address(0), "USDT not set");
        require(usdtAmount > 0, "Zero amount");
        uint256 protoAmount = quoteUsdtToProto(usdtAmount);
        require(protoAmount > 0, "Amount too small");
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        token.mint(msg.sender, protoAmount);
        emit BoughtWithUsdt(msg.sender, protoAmount, usdtAmount);
        emit SwappedUsdtForProto(msg.sender, usdtAmount, protoAmount);
    }

    /// @notice Swap PROTO → USDT from treasury liquidity.
    function swapProtoForUsdt(uint256 protoAmount) external nonReentrant {
        require(address(usdt) != address(0), "USDT not set");
        require(protoAmount > 0, "Zero amount");
        uint256 usdtAmount = quoteProtoToUsdt(protoAmount);
        require(usdtAmount > 0, "Amount too small");
        require(usdt.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT liquidity");
        require(token.transferFrom(msg.sender, address(this), protoAmount), "Transfer failed");
        usdt.safeTransfer(msg.sender, usdtAmount);
        emit SwappedProtoForUsdt(msg.sender, protoAmount, usdtAmount);
    }

    /// @notice Swap USDT → PROTO.
    function swapUsdtForProto(uint256 usdtAmount) external nonReentrant {
        require(address(usdt) != address(0), "USDT not set");
        require(usdtAmount > 0, "Zero amount");
        uint256 protoAmount = quoteUsdtToProto(usdtAmount);
        require(protoAmount > 0, "Amount too small");
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        token.mint(msg.sender, protoAmount);
        emit SwappedUsdtForProto(msg.sender, usdtAmount, protoAmount);
        emit BoughtWithUsdt(msg.sender, protoAmount, usdtAmount);
    }

    /// @notice Swap PROTO back to native 1:1 when treasury holds liquidity.
    function swapProtoForNative(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(address(this).balance >= amount, "Insufficient liquidity");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Native transfer failed");
        emit Swapped(msg.sender, amount);
    }

    /// @notice Owner can pull USDC liquidity into the treasury.
    function fundUsdc(uint256 amount) external onlyOwner {
        require(address(usdc) != address(0), "USDC not set");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Owner can pull USDT liquidity into the treasury.
    function fundUsdt(uint256 amount) external onlyOwner {
        require(address(usdt) != address(0), "USDT not set");
        usdt.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Small demo reward mint (TILE claimTile analogue). Cap per call.
    function claimPlayReward(uint256 amount) external nonReentrant {
        require(demoMode, "Rewards claim disabled");
        require(amount > 0 && amount <= 100 ether, "Amount out of range");
        token.mint(msg.sender, amount);
        emit RewardsClaimed(msg.sender, amount);
    }

    function stakedBalance(address user) external view returns (uint256) {
        return staked[user];
    }

    function usdcLiquidity() external view returns (uint256) {
        if (address(usdc) == address(0)) return 0;
        return usdc.balanceOf(address(this));
    }

    function usdtLiquidity() external view returns (uint256) {
        if (address(usdt) == address(0)) return 0;
        return usdt.balanceOf(address(this));
    }
}
