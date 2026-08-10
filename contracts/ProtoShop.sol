// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ProtoItems.sol";

/**
 * @title ProtoShop
 * @notice Video-game item shop. Purchases are payable in PROTO only.
 *         Listings are organized by video game (browse games → items).
 */
contract ProtoShop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable proto;
    ProtoItems public immutable items;
    address public paymentRecipient;

    struct Listing {
        uint256 priceProto; // 18-decimal PROTO wei
        bool active;
        string name;
        string metadataURI;
        string game; // e.g. "Texas Hold'em", "Blackjack"
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextItemId = 1;

    event ItemListed(
        uint256 indexed itemId,
        uint256 priceProto,
        string name,
        string metadataURI,
        string game
    );
    event ItemUpdated(uint256 indexed itemId, uint256 priceProto, bool active);
    event ItemPurchased(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPaid
    );
    event PaymentRecipientUpdated(address indexed recipient);

    constructor(address protoToken, address itemsContract, address recipient) {
        require(protoToken != address(0), "Invalid PROTO");
        require(itemsContract != address(0), "Invalid items");
        proto = IERC20(protoToken);
        items = ProtoItems(itemsContract);
        paymentRecipient = recipient == address(0) ? msg.sender : recipient;
    }

    function setPaymentRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        paymentRecipient = recipient;
        emit PaymentRecipientUpdated(recipient);
    }

    function listItem(
        uint256 priceProto,
        string calldata name_,
        string calldata metadataURI,
        string calldata game_
    ) external onlyOwner returns (uint256 itemId) {
        require(priceProto > 0, "Invalid price");
        require(bytes(name_).length > 0, "Invalid name");
        require(bytes(game_).length > 0, "Invalid game");
        itemId = nextItemId++;
        listings[itemId] = Listing({
            priceProto: priceProto,
            active: true,
            name: name_,
            metadataURI: metadataURI,
            game: game_
        });
        items.setTokenURI(itemId, metadataURI);
        emit ItemListed(itemId, priceProto, name_, metadataURI, game_);
    }

    function updateItem(
        uint256 itemId,
        uint256 priceProto,
        bool active,
        string calldata name_,
        string calldata metadataURI,
        string calldata game_
    ) external onlyOwner {
        Listing storage listing = listings[itemId];
        require(bytes(listing.name).length > 0 || listing.priceProto > 0, "Unknown item");
        require(priceProto > 0, "Invalid price");
        require(bytes(game_).length > 0, "Invalid game");
        listing.priceProto = priceProto;
        listing.active = active;
        listing.name = name_;
        listing.metadataURI = metadataURI;
        listing.game = game_;
        items.setTokenURI(itemId, metadataURI);
        emit ItemUpdated(itemId, priceProto, active);
    }

    function getListing(uint256 itemId)
        external
        view
        returns (
            uint256 priceProto,
            bool active,
            string memory name_,
            string memory metadataURI,
            string memory game_
        )
    {
        Listing storage listing = listings[itemId];
        return (
            listing.priceProto,
            listing.active,
            listing.name,
            listing.metadataURI,
            listing.game
        );
    }

    /// @notice Buy `quantity` of `itemId` paying only in PROTO.
    function buy(uint256 itemId, uint256 quantity) external nonReentrant {
        require(quantity > 0, "Zero quantity");
        Listing storage listing = listings[itemId];
        require(listing.active, "Item not for sale");
        require(listing.priceProto > 0, "Invalid listing");

        uint256 total = listing.priceProto * quantity;
        require(total / quantity == listing.priceProto, "Overflow");

        proto.safeTransferFrom(msg.sender, paymentRecipient, total);
        items.mint(msg.sender, itemId, quantity, "");

        emit ItemPurchased(msg.sender, itemId, quantity, total);
    }
}
