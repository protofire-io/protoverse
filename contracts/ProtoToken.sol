// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProtoToken
 * @notice Native PROTO ERC-20 for ProtoVerse (mirrors Mini Games TILE pattern).
 */
contract ProtoToken is ERC20, Ownable {
    address public minter;

    event MinterUpdated(address indexed minter);

    constructor(address initialMinter) ERC20("Proto", "PROTO") {
        require(initialMinter != address(0), "Invalid minter");
        minter = initialMinter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Unauthorized minter");
        require(to != address(0), "Invalid to");
        require(amount > 0, "Zero amount");
        _mint(to, amount);
    }

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Invalid minter");
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }
}
