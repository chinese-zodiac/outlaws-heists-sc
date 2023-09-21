// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./LocationBase.sol";
import "./TokenBase.sol";
import "./RngHistory.sol";
import "./BoostedValueCalculator.sol";
import "./interfaces/IEntity.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract LocTemplateResource is LocationBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Timers for Timers.Timestamp;
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint64 public travelTime = 4 hours;
    IEntity public gang;

    TokenBase public resourceToken;

    uint256 public baseProdDaily;
    uint256 public currentProdDaily;
    uint256 public totalPull;
    mapping(uint256 => uint256) public gangProdDaily;
    mapping(uint256 => uint256) public gangPull;
    mapping(uint256 => uint256) public gangPower;

    ILocation public town;
    RngHistory public rngHistory;
    BoostedValueCalculator public boostedValueCalculator;

    struct MovementPreparation {
        Timers.Timestamp readyTimer;
        ILocation destination;
    }
    mapping(uint256 => MovementPreparation) gangMovementPreparations;

    EnumerableSet.AddressSet randomDestinations;

    constructor(
        ILocationController _locationController,
        IEntity _gang,
        ILocation _town,
        RngHistory _rngHistory,
        BoostedValueCalculator _boostedValueCalculator,
        TokenBase _resourceToken,
        uint256 _baseProdDaily
    ) LocationBase(_locationController) {
        baseProdDaily = _baseProdDaily;
        currentProdDaily = _baseProdDaily;
        rngHistory = _rngHistory;
        boostedValueCalculator = _boostedValueCalculator;
        resourceToken = _resourceToken;
        gang = _gang;
        town = _town;
    }

    function prepareToMoveGangToTown(
        uint256 gangId
    ) external onlyLocalEntity(gang, gangId) {
        require(msg.sender == gang.ownerOf(gangId), "Only gang owner");
        //since move is to a random resource location, the destination should be kept blank.
        gangMovementPreparations[gangId].readyTimer.setDeadline(
            uint64(block.timestamp) + travelTime
        );
    }

    function prepareToMoveGangToRandomLocation(
        uint256 gangId
    ) external onlyLocalEntity(gang, gangId) {
        require(msg.sender == gang.ownerOf(gangId), "Only gang owner");
        //since move is to a random resource location, the destination should be kept blank.
        gangMovementPreparations[gangId].readyTimer.setDeadline(
            uint64(block.timestamp) + travelTime
        );
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
            //TODO: set pull, resource production, power
            gangPower[_entityId] = boostedValueCalculator.getBoostedValue(
                _from,
                keccak256(abi.encodePacked("GANG_POWER")),
                _entityId
            );
            gangPull[_entityId] = boostedValueCalculator.getBoostedValue(
                _from,
                keccak256(abi.encodePacked("GANG_PULL")),
                _entityId
            );
            totalPull += gangPull[_entityId];
            gangProdDaily[_entityId] = boostedValueCalculator.getBoostedValue(
                _from,
                keccak256(abi.encodePacked("GANG_PROD_DAILY")),
                _entityId
            );
            currentProdDaily += gangProdDaily[_entityId];
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

            //remove pull, base resources, power
            totalPull -= gangPull[_entityId];
            currentProdDaily -= gangProdDaily[_entityId];
            delete gangPull[_entityId];
            delete gangPower[_entityId];
            delete gangProdDaily[_entityId];
        }
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
        return gangMovementPreparations[gangId].readyTimer.isPending();
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

    function setRandomDestinations(
        address[] calldata _destinations,
        bool isDestination
    ) public onlyRole(VALID_ENTITY_SETTER) {
        if (isDestination) {
            for (uint i; i < _destinations.length; i++) {
                randomDestinations.add(_destinations[i]);
            }
        } else {
            for (uint i; i < _destinations.length; i++) {
                randomDestinations.remove(_destinations[i]);
            }
        }
    }

    function setRngHistory(RngHistory to) external onlyRole(MANAGER_ROLE) {
        rngHistory = to;
    }

    function setTown(ILocation to) external onlyRole(MANAGER_ROLE) {
        town = to;
    }

    function setResourceToken(TokenBase to) external onlyRole(MANAGER_ROLE) {
        resourceToken = to;
    }

    function setTravelTime(uint64 to) external onlyRole(MANAGER_ROLE) {
        travelTime = to;
    }

    function setBaseResourcesPerDay(
        uint256 to
    ) external onlyRole(MANAGER_ROLE) {
        currentProdDaily -= baseProdDaily;
        baseProdDaily = to;
        currentProdDaily += baseProdDaily;
    }
}
