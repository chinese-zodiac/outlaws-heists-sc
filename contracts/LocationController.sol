// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./MetadataCid.sol";
import "./interfaces/IEntity.sol";
import "./interfaces/ILocationController.sol";

//Permisionless LocationController
//Anyone can implement ILocation and then allow users to init/move entities using this controller.
//Allows the location to be looked up for entitites, so location based logic is possible for games with locations.
contract LocationController is
    AccessControlEnumerable,
    MetadataCid,
    ILocationController
{
    using EnumerableSet for EnumerableSet.UintSet;

    mapping(ILocation => mapping(IEntity => EnumerableSet.UintSet)) locationEntitiesIndex;
    mapping(IEntity => mapping(uint256 => ILocation)) entityLocation;

    modifier onlyEntityOwner(IEntity _entityContract, uint256 _nftId) {
        require(
            msg.sender == _entityContract.ownerOf(_nftId),
            "Only entity owner"
        );
        _;
    }

    constructor(string memory _ipfsMetadataCid) MetadataCid(_ipfsMetadataCid) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //Moves entity from current location to new location.
    //First updates the entity's location, then calls arrival/departure hooks.
    function move(
        IEntity _entityContract,
        uint256 _nftId,
        ILocation _dest
    ) external onlyEntityOwner(_entityContract, _nftId) {
        ILocation _prev = entityLocation[_entityContract][_nftId];
        entityLocation[_entityContract][_nftId] = _dest;
        locationEntitiesIndex[_prev][_entityContract].remove(_nftId);
        locationEntitiesIndex[_dest][_entityContract].add(_nftId);

        _prev.LOCATION_CONTROLLER_onDeparture(_entityContract, _nftId);
        _prev.LOCATION_CONTROLLER_onArrival(_entityContract, _nftId);
    }

    //Register a new entity, so it can move in the future.
    function register(
        IEntity _entityContract,
        uint256 _nftId,
        ILocation _to
    ) external;

    //Unregister an entity, so it is no longer tracked as at a specific location.
    function unregister(IEntity _entityContract, uint256 _nftId) external;

    //High gas usage, view only
    function viewOnly_getAllLocalEntitiesFor(
        ILocation _location,
        IEntity _entityContract
    )
        external
        view
        override
        returns (
            uint256[] memory entityIds_,
            address[] memory boundWallets_,
            address[] memory owners_
        )
    {
        //TODO: return all
        entityIds_ = locationEntitiesIndex[_location][_entityContract].values();
    }

    function getEntityLocation(IEntity _entityContract, uint256 _nftId)
        public
        view
        override
        returns (ILocation)
    {
        return entityLocation[_entityContract][_nftId];
    }

    function getLocalEntityCountFor(
        ILocation _location,
        IEntity _entityContract
    ) public view override returns (uint256) {
        return locationEntitiesIndex[_location][_entityContract].length();
    }

    function getLocalEntityAtIndexFor(
        ILocation _location,
        IEntity _entityContract,
        uint256 _i
    )
        public
        view
        override
        returns (
            uint256 nftId_,
            address boundAccount_,
            address owner_
        )
    {
        nftId_ = locationEntitiesIndex[_location][_entityContract].at(_i);
        boundAccount_ = _entityContract.boundAccount(nftId_);
        owner_ = _entityContract.ownerOf(nftId_);
    }
}
