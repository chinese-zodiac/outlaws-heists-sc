// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "./interfaces/ILocation.sol";
import "./interfaces/ILocationController.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract LocationBase is ILocation, AccessControlEnumerable {
    using EnumerableSet for EnumerableSet.AddressSet;

    ILocationController immutable locationController;
    bytes32 public constant VALID_ROUTE_SETTER =
        keccak256("VALID_ROUTE_SETTER");

    bytes32 public constant VALID_ENTITY_SETTER =
        keccak256("VALID_ENTITY_SETTER");

    EnumerableSet.AddressSet validSources;
    EnumerableSet.AddressSet validDestinations;

    EnumerableSet.AddressSet validEntities;

    constructor(ILocationController _locationController) {
        locationController = _locationController;
        _grantRole(VALID_ROUTE_SETTER, msg.sender);
        _grantRole(VALID_ENTITY_SETTER, msg.sender);
    }

    modifier onlyLocalEntity(IERC721 _entity, uint256 _entityId) {
        require(
            address(this) ==
                address(
                    locationController.getEntityLocation(_entity, _entityId)
                ),
            "Only local entity"
        );
        _;
    }

    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onArrival(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _from
    ) external virtual {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(validSources.contains(address(_from)), "Invalid source");
        require(validEntities.contains(address(_entity)), "Invalid entity");
    }

    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onDeparture(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _to
    ) external virtual {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(
            validDestinations.contains(address(_to)),
            "Invalid destination"
        );
        require(validEntities.contains(address(_entity)), "Invalid entity");
    }

    function setValidRoute(
        address[] calldata _locations,
        bool isValid
    ) public onlyRole(VALID_ROUTE_SETTER) {
        if (isValid) {
            for (uint i; i < _locations.length; i++) {
                validSources.add(_locations[i]);
                validDestinations.add(_locations[i]);
            }
        } else {
            for (uint i; i < _locations.length; i++) {
                validSources.remove(_locations[i]);
                validDestinations.remove(_locations[i]);
            }
        }
    }

    function setValidEntities(
        address[] calldata _entities,
        bool isValid
    ) public onlyRole(VALID_ENTITY_SETTER) {
        if (isValid) {
            for (uint i; i < _entities.length; i++) {
                validEntities.add(_entities[i]);
            }
        } else {
            for (uint i; i < _entities.length; i++) {
                validEntities.remove(_entities[i]);
            }
        }
    }

    //High gas usage, view only
    function viewOnly_getAllValidSources()
        external
        view
        override
        returns (address[] memory locations_)
    {
        locations_ = validSources.values();
    }

    function getValidSourceCount() public view override returns (uint256) {
        return validSources.length();
    }

    function getValidSourceAt(
        uint256 _i
    ) public view override returns (address) {
        return validSources.at(_i);
    }

    //High gas usage, view only
    function viewOnly_getAllValidDestinations()
        external
        view
        override
        returns (address[] memory locations_)
    {
        locations_ = validDestinations.values();
    }

    function getValidDestinationCount() public view override returns (uint256) {
        return validDestinations.length();
    }

    function getValidDestinationAt(
        uint256 _i
    ) public view override returns (address) {
        return validDestinations.at(_i);
    }

    //High gas usage, view only
    function viewOnly_getAllValidEntities()
        external
        view
        override
        returns (address[] memory entities_)
    {
        entities_ = validEntities.values();
    }

    function getValidEntitiesCount() public view override returns (uint256) {
        return validEntities.length();
    }

    function getValidEntitiesAt(
        uint256 _i
    ) public view override returns (address) {
        return validEntities.at(_i);
    }
}
