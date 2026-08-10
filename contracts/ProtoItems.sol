// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProtoItems
 * @notice ERC-1155 game items / cosmetics for the ProtoVerse shop.
 */
contract ProtoItems is ERC1155, Ownable {
    address public minter;
    string public name = "Proto Items";
    string public symbol = "PROTOITEM";

    mapping(uint256 => string) private _tokenURIs;

    event MinterUpdated(address indexed minter);
    event URISet(uint256 indexed id, string uri);

    constructor(address initialMinter) ERC1155("") {
        require(initialMinter != address(0), "Invalid minter");
        minter = initialMinter;
    }

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Invalid minter");
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    function setTokenURI(uint256 id, string calldata tokenURI_) external {
        require(msg.sender == minter || msg.sender == owner(), "Unauthorized");
        _tokenURIs[id] = tokenURI_;
        emit URISet(id, tokenURI_);
    }

    function uri(uint256 id) public view override returns (string memory) {
        string memory tokenURI_ = _tokenURIs[id];
        if (bytes(tokenURI_).length > 0) return tokenURI_;
        return super.uri(id);
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        require(msg.sender == minter || msg.sender == owner(), "Unauthorized minter");
        require(to != address(0), "Invalid to");
        require(amount > 0, "Zero amount");
        _mint(to, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes memory data
    ) external {
        require(msg.sender == minter || msg.sender == owner(), "Unauthorized minter");
        _mintBatch(to, ids, amounts, data);
    }
}
