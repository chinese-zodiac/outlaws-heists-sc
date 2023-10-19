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
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LocTemplateResource is LocationBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using Counters for Counters.Counter;
    using Timers for Timers.Timestamp;
    using SafeERC20 for IERC20;

    struct ShopItem {
        TokenBase item;
        TokenBase currency;
        uint256 pricePerItemWad;
        uint256 increasePerItemSold;
        uint256 totalSold;
    }

    bytes32 public constant BOOSTER_GANG_PULL =
        keccak256(abi.encodePacked("BOOSTER_GANG_PULL"));
    bytes32 public constant BOOSTER_GANG_PROD_DAILY =
        keccak256(abi.encodePacked("BOOSTER_GANG_PROD_DAILY"));
    bytes32 public constant BOOSTER_GANG_POWER =
        keccak256(abi.encodePacked("BOOSTER_GANG_POWER"));

    EnumerableSet.UintSet shopItemKeys;
    Counters.Counter shopItemNextUid;
    mapping(uint256 => ShopItem) public shopItems;

    EntityStoreERC20 public entityStoreERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    ERC20Burnable public bandit;
    Roller public roller;

    //travelTime is consumed by a booster
    uint64 public travelTime = 4 hours;
    IEntity public gang;

    TokenBase public resourceToken;

    uint256 public baseProdDaily;
    uint256 public currentProdDaily;
    mapping(uint256 => uint256) public gangProdDaily;
    mapping(uint256 => uint256) public gangPower;

    //attackCooldown is consumed by a booster
    uint256 public attackCooldown = 4 hours;
    mapping(uint256 => uint256) public gangLastAttack;
    mapping(uint256 => uint256) public gangAttackCooldown;
    mapping(uint256 => uint256) public gangAttackTarget;

    uint256 public attackCostBps = 100;
    uint256 public victoryTransferBps = 10000;

    RngHistory public rngHistory;
    BoostedValueCalculator public boostedValueCalculator;
    ResourceStakingPool public resourceStakingPool;

    struct MovementPreparation {
        Timers.Timestamp readyTimer;
        ILocation destination;
    }
    mapping(uint256 => MovementPreparation) gangMovementPreparations;

    EnumerableSet.AddressSet randomDestinations;
    EnumerableSet.AddressSet fixedDestinations;

    constructor(
        ILocationController _locationController,
        EntityStoreERC20 _entityStoreERC20,
        IEntity _gang,
        ERC20Burnable _bandit,
        RngHistory _rngHistory,
        BoostedValueCalculator _boostedValueCalculator,
        TokenBase _resourceToken,
        Roller _roller,
        uint256 _baseProdDaily
    ) LocationBase(_locationController) {
        entityStoreERC20 = _entityStoreERC20;
        baseProdDaily = _baseProdDaily;
        currentProdDaily = _baseProdDaily;
        rngHistory = _rngHistory;
        boostedValueCalculator = _boostedValueCalculator;
        resourceToken = _resourceToken;
        gang = _gang;
        bandit = _bandit;
        roller = _roller;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(VALID_ENTITY_SETTER, msg.sender);

        resourceStakingPool = new ResourceStakingPool(
            _resourceToken,
            _baseProdDaily / 24 hours,
            address(this)
        );
    }

    modifier onlyGangOwner(uint256 gangId) {
        require(msg.sender == gang.ownerOf(gangId), "Only gang owner");
        _;
    }

    function depositERC20(
        uint256 gangId,
        IERC20 token,
        uint256 wad
    ) external onlyGangOwner(gangId) {
        require(token != bandit, "Cannot deposit bandits");
        token.safeTransferFrom(msg.sender, address(this), wad);
        token.approve(address(entityStoreERC20), wad);
        entityStoreERC20.deposit(
            gang,
            gangId,
            token,
            token.balanceOf(address(this))
        );
        _haltGangProduction(gangId);
        _startGangProduction(gangId);
    }

    function withdrawERC20(
        uint256 gangId,
        IERC20 token,
        uint256 wad
    ) external onlyGangOwner(gangId) {
        require(token != bandit, "Cannot withdraw bandits");
        entityStoreERC20.withdraw(gang, gangId, token, wad);
        token.safeTransfer(msg.sender, token.balanceOf(address(this)));
        _haltGangProduction(gangId);
        _startGangProduction(gangId);
    }

    function buyShopItem(
        uint256 gangId,
        uint256 shopItemId,
        uint256 quantity
    ) external onlyLocalEntity(gang, gangId) {
        ShopItem memory item = shopItems[shopItemId];
        entityStoreERC20.burn(
            gang,
            gangId,
            item.currency,
            (quantity *
                (item.pricePerItemWad +
                    item.totalSold *
                    item.increasePerItemSold)) / 1 ether
        );
        item.item.mint(address(this), quantity);
        item.totalSold += quantity;
        item.item.approve(address(entityStoreERC20), quantity);
        entityStoreERC20.deposit(gang, gangId, item.item, quantity);
    }

    function claimPendingResources(
        uint256 gangId
    ) public onlyGangOwner(gangId) {
        if (resourceStakingPool.pendingReward(bytes32(gangId)) == 0) {
            return;
        }
        uint256 initialResourceBal = resourceToken.balanceOf(address(this));
        resourceStakingPool.claimFor(bytes32(gangId));
        uint256 deltabal = resourceToken.balanceOf(address(this)) -
            initialResourceBal;
        resourceToken.approve(address(entityStoreERC20), deltabal);
        entityStoreERC20.deposit(gang, gangId, resourceToken, deltabal);
    }

    function startAttack(
        uint256 attackerGangId,
        uint256 defenderGangId
    )
        external
        payable
        onlyLocalEntity(gang, attackerGangId)
        onlyLocalEntity(gang, defenderGangId)
        onlyGangOwner(attackerGangId)
    {
        require(
            msg.value == rngHistory.requestFee(),
            "Must pay rngHistory.requestFee"
        );
        require(
            gangAttackCooldown[attackerGangId] <= block.timestamp,
            "Attack on cooldown"
        );
        rngHistory.requestRandomWord{value: msg.value}();
        gangLastAttack[attackerGangId] = block.timestamp;
        gangAttackCooldown[attackerGangId] = block.timestamp + attackCooldown;
        gangAttackTarget[attackerGangId] = defenderGangId;
    }

    function resolveAttack(uint256 attackerGangId) public {
        require(gangLastAttack[attackerGangId] != 0, "No attack queued");
        uint256 defenderGangId = gangAttackTarget[attackerGangId];

        uint256 randWord = rngHistory.getAtOrAfterTimestamp(
            uint64(gangLastAttack[attackerGangId] + 1) //prevent resolving in same block as attack
        );
        require(randWord != 0, "randWord not yet available");

        if (
            address(this) !=
            address(locationController.getEntityLocation(gang, defenderGangId))
        ) {
            //defender ran away, do nothing
        } else {
            uint256 attackerPower = gangPower[attackerGangId];
            uint256 defenderPower = gangPower[defenderGangId];

            //Destroy the bandit cost from attacker
            entityStoreERC20.burn(
                gang,
                attackerGangId,
                bandit,
                (attackCostBps *
                    entityStoreERC20.getStoredER20WadFor(
                        gang,
                        attackerGangId,
                        bandit
                    )) / 10000
            );

            if (
                roller
                    .getUniformRoll(
                        keccak256(
                            abi.encodePacked(
                                randWord,
                                attackerGangId,
                                defenderGangId
                            )
                        ),
                        UD60x18.wrap(0),
                        UD60x18.wrap(100 ether)
                    )
                    .lt(
                        UD60x18.wrap(
                            (100 ether * attackerPower) /
                                (attackerPower + defenderPower)
                        )
                    )
            ) {
                //victory
                entityStoreERC20.transfer(
                    gang,
                    defenderGangId,
                    gang,
                    attackerGangId,
                    bandit,
                    (victoryTransferBps *
                        entityStoreERC20.getStoredER20WadFor(
                            gang,
                            defenderGangId,
                            bandit
                        )) / 10000
                );
                _haltGangProduction(defenderGangId);
                _startGangProduction(defenderGangId);
            } else {
                //defeat, do nothing
            }
            _haltGangProduction(attackerGangId);
            _startGangProduction(attackerGangId);
        }

        delete gangLastAttack[attackerGangId];
        delete gangAttackTarget[attackerGangId];
    }

    function prepareToMoveGangToFixedDestination(
        uint256 gangId,
        ILocation destination
    ) external onlyLocalEntity(gang, gangId) onlyGangOwner(gangId) {
        require(fixedDestinations.contains(address(destination)));
        gangMovementPreparations[gangId].destination = destination;
        _prepareMove(gangId);
    }

    function prepareToMoveGangToRandomLocation(
        uint256 gangId
    ) external onlyLocalEntity(gang, gangId) onlyGangOwner(gangId) {
        //since move is to a random resource location, the destination should be kept blank.
        gangMovementPreparations[gangId].destination = ILocation(address(0x0));
        _prepareMove(gangId);
    }

    function _prepareMove(uint256 gangId) internal {
        gangMovementPreparations[gangId].readyTimer.setDeadline(
            uint64(block.timestamp + travelTime)
        );

        if (gangLastAttack[gangId] != 0) {
            //resolve pending attack
            resolveAttack(gangId);
        }

        _haltGangProduction(gangId);
    }

    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onArrival(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _from
    ) external virtual override {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(validSources.contains(address(_from)), "Invalid source");
        require(validEntities.contains(address(_entity)), "Invalid entity");
        if (_entity == gang) {
            gangPower[_entityId] = boostedValueCalculator.getBoostedValue(
                this,
                BOOSTER_GANG_POWER,
                gang,
                _entityId
            );
            _startGangProduction(_entityId);
        }
    }

    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onDeparture(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _to
    ) external virtual override {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(
            validDestinations.contains(address(_to)),
            "Invalid destination"
        );
        require(validEntities.contains(address(_entity)), "Invalid entity");
        if (_entity == gang) {
            //Only let prepared entities go
            require(isGangReadyToMove(_entityId), "Gang not ready to move");
            //Only go to prepared destination
            require(
                _to == gangDestination(_entityId),
                "Gang not prepared to travel there"
            );

            //reset timer
            gangMovementPreparations[_entityId].readyTimer.reset();

            delete gangPower[_entityId];
        }
    }

    function pendingResources(uint256 gangId) external view returns (uint256) {
        return resourceStakingPool.pendingReward(bytes32(gangId));
    }

    function gangPull(uint256 gangId) public view returns (uint256) {
        return resourceStakingPool.getShares(bytes32(gangId));
    }

    function totalPull() public view returns (uint256) {
        return resourceStakingPool.totalShares();
    }

    function gangResourcesPerDay(
        uint256 gangId
    ) external view returns (uint256) {
        if (totalPull() == 0) return 0;
        return (gangPull(gangId) * currentProdDaily) / totalPull();
    }

    function gangDestination(uint256 gangId) public view returns (ILocation) {
        if (
            gangMovementPreparations[gangId].destination !=
            ILocation(address(0x0))
        ) {
            //If a destination was set, go there
            return gangMovementPreparations[gangId].destination;
        }
        //If the gang isn't ready, it cant go anywhere
        if (!isGangReadyToMove(gangId)) {
            return ILocation(address(0x0));
        }
        //If the gang is ready, and not going to a set destination, pick a random destination from the list
        bytes32 randWord = keccak256(
            abi.encodePacked(
                rngHistory.getAtOrAfterTimestamp(
                    gangMovementPreparations[gangId].readyTimer.getDeadline()
                ),
                gang,
                gangId
            )
        );
        return
            ILocation(
                getRandomDestinationAt(
                    uint256(randWord) % (getRandomDestinationsCount() - 1)
                )
            );
    }

    function isGangPreparingToMove(uint256 gangId) public view returns (bool) {
        return
            gangMovementPreparations[gangId].readyTimer.isPending() ||
            isGangReadyToMove(gangId);
    }

    function isGangReadyToMove(uint256 gangId) public view returns (bool) {
        return gangMovementPreparations[gangId].readyTimer.isExpired();
    }

    function isGangWorking(uint256 gangId) public view returns (bool) {
        return
            gangMovementPreparations[gangId].readyTimer.isUnset() &&
            locationController.getEntityLocation(gang, gangId) == this;
    }

    function whenGangIsReadyToMove(
        uint256 gangId
    ) public view returns (uint64) {
        return gangMovementPreparations[gangId].readyTimer.getDeadline();
    }

    //High gas usage, view only
    function viewOnly_getAllRandomDestinations()
        external
        view
        returns (address[] memory destinations_)
    {
        destinations_ = randomDestinations.values();
    }

    function getRandomDestinationsCount() public view returns (uint256) {
        return randomDestinations.length();
    }

    function getRandomDestinationAt(uint256 _i) public view returns (address) {
        return randomDestinations.at(_i);
    }

    //High gas usage, view only
    function viewOnly_getAllFixedDestinations()
        external
        view
        returns (address[] memory destinations_)
    {
        destinations_ = fixedDestinations.values();
    }

    function getFixedDestinationsCount() public view returns (uint256) {
        return fixedDestinations.length();
    }

    function getFixedDestinationAt(uint256 _i) public view returns (address) {
        return fixedDestinations.at(_i);
    }

    //High gas usage, view only
    function viewOnly_getAllShopItems()
        external
        view
        returns (ShopItem[] memory items)
    {
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

    function setRandomDestinations(
        address[] calldata _destinations,
        bool isDestination
    ) public onlyRole(MANAGER_ROLE) {
        if (isDestination) {
            for (uint i; i < _destinations.length; i++) {
                randomDestinations.add(_destinations[i]);
                validDestinations.add(_destinations[i]);
                validSources.add(_destinations[i]);
            }
        } else {
            for (uint i; i < _destinations.length; i++) {
                randomDestinations.remove(_destinations[i]);
                validDestinations.remove(_destinations[i]);
                validSources.remove(_destinations[i]);
            }
        }
    }

    function setFixedDestinations(
        address[] calldata _destinations,
        bool isDestination
    ) public onlyRole(MANAGER_ROLE) {
        if (isDestination) {
            for (uint i; i < _destinations.length; i++) {
                fixedDestinations.add(_destinations[i]);
                validDestinations.add(_destinations[i]);
                validSources.add(_destinations[i]);
            }
        } else {
            for (uint i; i < _destinations.length; i++) {
                fixedDestinations.remove(_destinations[i]);
                validDestinations.remove(_destinations[i]);
                validSources.remove(_destinations[i]);
            }
        }
    }

    function setRngHistory(RngHistory to) external onlyRole(MANAGER_ROLE) {
        rngHistory = to;
    }

    function setBoostedValueCalculator(
        BoostedValueCalculator to
    ) external onlyRole(MANAGER_ROLE) {
        boostedValueCalculator = to;
    }

    function setResourceStakingPool(
        ResourceStakingPool to
    ) external onlyRole(MANAGER_ROLE) {
        resourceStakingPool = to;
    }

    function setResourceToken(TokenBase to) external onlyRole(MANAGER_ROLE) {
        resourceToken = to;
        resourceStakingPool.setRewardToken(to);
    }

    function setRoller(Roller to) external onlyRole(MANAGER_ROLE) {
        roller = to;
    }

    function setAttackCooldown(uint256 to) external onlyRole(MANAGER_ROLE) {
        attackCooldown = to;
    }

    function setAttackCostBps(uint64 to) external onlyRole(MANAGER_ROLE) {
        attackCostBps = to;
    }

    function setVictoryTransferBps(uint64 to) external onlyRole(MANAGER_ROLE) {
        victoryTransferBps = to;
    }

    function setTravelTime(uint64 to) external onlyRole(MANAGER_ROLE) {
        travelTime = to;
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

    function setBaseResourcesPerDay(
        uint256 to
    ) external onlyRole(MANAGER_ROLE) {
        currentProdDaily -= baseProdDaily;
        baseProdDaily = to;
        currentProdDaily += baseProdDaily;
    }

    function _haltGangProduction(uint256 gangId) internal {
        claimPendingResources(gangId);
        resourceStakingPool.setRewardPerSecond(currentProdDaily / 24 hours);
        resourceStakingPool.withdrawFor(bytes32(gangId));
        currentProdDaily -= gangProdDaily[gangId];
        delete gangProdDaily[gangId];
    }

    function _startGangProduction(uint256 gangId) internal {
        uint256 pull = boostedValueCalculator.getBoostedValue(
            this,
            BOOSTER_GANG_PULL,
            gang,
            gangId
        );
        gangProdDaily[gangId] = boostedValueCalculator.getBoostedValue(
            this,
            BOOSTER_GANG_PROD_DAILY,
            gang,
            gangId
        );
        currentProdDaily += gangProdDaily[gangId];

        resourceStakingPool.setRewardPerSecond(currentProdDaily / 24 hours);
        resourceStakingPool.depositFor(bytes32(gangId), pull);
    }
}
