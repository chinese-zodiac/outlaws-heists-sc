// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./interfaces/ILocation.sol";
import "./interfaces/ILocationController.sol";

//Permisionless LocationController
//Anyone can implement ILocation and then allow users to init/move entities using this controller.
//Allows the location to be looked up for entitites, so location based logic is possible for games with locations.
contract LocationController is ILocationController {
    using EnumerableSet for EnumerableSet.UintSet;

    mapping(ILocation => mapping(IERC721 => EnumerableSet.UintSet)) locationEntitiesIndex;
    mapping(IERC721 => mapping(uint256 => ILocation)) entityLocation;

    modifier onlyEntityOwner(IERC721 _entity, uint256 _entityId) {
        require(
            msg.sender == _entity.ownerOf(_entityId),
            "Only entity owner"
        );
        _;
    }

    //Moves entity from current location to new location.
    //First updates the entity's location, then calls arrival/departure hooks.
    function move(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _dest
    ) external onlyEntityOwner(_entity, _entityId) {
        ILocation _prev = entityLocation[_entity][_entityId];
        entityLocation[_entity][_entityId] = _dest;
        locationEntitiesIndex[_prev][_entity].remove(_entityId);
        locationEntitiesIndex[_dest][_entity].add(_entityId);

        _prev.LOCATION_CONTROLLER_onDeparture(_entity, _entityId, _dest);
        _dest.LOCATION_CONTROLLER_onArrival(_entity, _entityId, _prev);
    }

    //Register a new entity, so it can move in the future.
    function register(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _to
    ) external {
        entityLocation[_entity][_entityId] = _to;
        locationEntitiesIndex[_to][_entity].add(_entityId);
        _to.LOCATION_CONTROLLER_onArrival(
            _entity,
            _entityId,
            ILocation(address(0x0))
        );
    }

    //Unregister an entity, so it is no longer tracked as at a specific location.
    function unregister(IERC721 _entity, uint256 _entityId) external {
        ILocation _prev = entityLocation[_entity][_entityId];
        delete entityLocation[_entity][_entityId];
        locationEntitiesIndex[_prev][_entity].remove(_entityId);

        _prev.LOCATION_CONTROLLER_onDeparture(
            _entity,
            _entityId,
            ILocation(address(0x0))
        );
    }

    //High gas usage, view only
    function viewOnly_getAllLocalEntitiesFor(
        ILocation _location,
        IERC721 _entity
    ) external view override returns (uint256[] memory entityIds_) {
        //TODO: return all
        entityIds_ = locationEntitiesIndex[_location][_entity].values();
    }

    function getEntityLocation(
        IERC721 _entity,
        uint256 _entityId
    ) public view override returns (ILocation) {
        return entityLocation[_entity][_entityId];
    }

    function getLocalEntityCountFor(
        ILocation _location,
        IERC721 _entity
    ) public view override returns (uint256) {
        return locationEntitiesIndex[_location][_entity].length();
    }

    function getLocalEntityAtIndexFor(
        ILocation _location,
        IERC721 _entity,
        uint256 _i
    ) public view override returns (uint256 entityId_, address owner_) {
        entityId_ = locationEntitiesIndex[_location][_entity].at(_i);
        owner_ = _entity.ownerOf(entityId_);
    }
}
