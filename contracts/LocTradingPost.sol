// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./LocationBase.sol";
import "./TokenBase.sol";
import "./RngHistory.sol";
import "./BoostedValueCalculator.sol";
import "./interfaces/IEntity.sol";
import "./EntityStoreERC20.sol";
import "./ResourceStakingPool.sol";
import "./Roller.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LocTradingPost is LocationBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    EntityStoreERC20 public entityStoreERC20;

    struct ShopItem {
        TokenBase item;
        TokenBase currency;
        uint256 pricePerItemWad;
        uint256 increasePerItemSold;
        uint256 totalSold;
    }

    EnumerableSet.UintSet shopItemKeys;
    Counters.Counter shopItemNextUid;
    mapping(uint256 => ShopItem) public shopItems;

    modifier onlyEntityOwner(IEntity entity, uint256 entityId) {
        require(msg.sender == entity.ownerOf(entityId), "Only entity owner");
        _;
    }

    constructor(
        ILocationController _locationController,
        EntityStoreERC20 _entityStoreERC20
    ) LocationBase(_locationController) {
        entityStoreERC20 = _entityStoreERC20;
    }

    function buyShopItem(
        IEntity entity,
        uint256 entityId,
        uint256 shopItemId,
        uint256 quantity
    )
        external
        onlyLocalEntity(entity, entityId)
        onlyEntityOwner(entity, entityId)
    {
        ShopItem memory item = shopItems[shopItemId];
        entityStoreERC20.burn(
            entity,
            entityId,
            item.currency,
            (quantity *
                (item.pricePerItemWad +
                    item.totalSold *
                    item.increasePerItemSold)) / 1 ether
        );
        item.item.mint(address(this), quantity);
        item.totalSold += quantity;
        item.item.approve(address(entityStoreERC20), quantity);
        entityStoreERC20.deposit(entity, entityId, item.item, quantity);
    }

    function depositERC20(
        IEntity entity,
        uint256 entityId,
        IERC20 token,
        uint256 wad
    ) external onlyEntityOwner(entity, entityId) {
        token.safeTransferFrom(msg.sender, address(this), wad);
        token.approve(address(entityStoreERC20), wad);
        entityStoreERC20.deposit(
            entity,
            entityId,
            token,
            token.balanceOf(address(this))
        );
    }

    function withdrawERC20(
        IEntity entity,
        uint256 entityId,
        IERC20 token,
        uint256 wad
    ) external onlyEntityOwner(entity, entityId) {
        entityStoreERC20.withdraw(entity, entityId, token, wad);
        token.safeTransfer(msg.sender, token.balanceOf(address(this)));
    }

    //High gas usage, view only
    function viewOnly_getAllShopItems()
        external
        view
        returns (ShopItem[] memory items)
    {
        items = new ShopItem[](shopItemKeys.length());
        for (uint i; i < shopItemKeys.length(); i++) {
            items[i] = (shopItems[shopItemKeys.at(i)]);
        }
    }

    function getShopItemsCount() public view returns (uint256) {
        return shopItemKeys.length();
    }

    function getShopItemAt(
        uint256 index
    ) public view returns (ShopItem memory) {
        return shopItems[shopItemKeys.at(index)];
    }

    function addItemToShop(
        TokenBase item,
        TokenBase currency,
        uint256 pricePerItemWad,
        uint256 increasePerItemSold
    ) external onlyRole(MANAGER_ROLE) {
        uint256 id = shopItemNextUid.current();
        shopItemKeys.add(id);
        shopItems[id].item = item;
        shopItems[id].currency = currency;
        shopItems[id].pricePerItemWad = pricePerItemWad;
        shopItems[id].increasePerItemSold = increasePerItemSold;
        shopItemNextUid.increment();
    }

    function setItemInShop(
        uint256 index,
        TokenBase item,
        TokenBase currency,
        uint256 pricePerItemWad,
        uint256 increasePerItemSold
    ) external onlyRole(MANAGER_ROLE) {
        require(shopItemKeys.length() > index, "index not in shop");
        uint256 id = shopItemKeys.at(index);
        shopItems[id].item = item;
        shopItems[id].currency = currency;
        shopItems[id].pricePerItemWad = pricePerItemWad;
        shopItems[id].increasePerItemSold = increasePerItemSold;
    }

    function deleteItemFromShop(uint256 index) external onlyRole(MANAGER_ROLE) {
        require(shopItemKeys.length() > index, "index not in shop");
        uint256 id = shopItemKeys.at(index);
        delete shopItems[id].item;
        delete shopItems[id].currency;
        delete shopItems[id].pricePerItemWad;
        delete shopItems[id].increasePerItemSold;
        delete shopItems[id].totalSold;
        delete shopItems[id];
        shopItemKeys.remove(id);
    }
}
