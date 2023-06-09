// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "./interfaces/ILocation.sol";
import "./interfaces/ILocationController.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract LocationBase is ILocation, AccessControlEnumerable {
    ILocationController immutable locationController;
    using EnumerableSet for EnumerableSet.AddressSet;
    bytes32 public constant VALID_ROUTE_SETTER =
        keccak256("VALID_ROUTE_SETTER");

    EnumerableSet.AddressSet validSources;
    EnumerableSet.AddressSet validDestinations;

    constructor(ILocationController _locationController) {
        locationController = _locationController;
        _grantRole(VALID_ROUTE_SETTER, msg.sender);
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

    function LOCATION_CONTROLLER_onArrival(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _from
    ) external {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(validSources.contains(address(_from)), "Invalid source");
    }

    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onDeparture(
        IERC721 _entity,
        uint256 _entityId,
        ILocation _to
    ) external {
        require(msg.sender == address(locationController), "Sender must be LC");
        require(
            validDestinations.contains(address(_to)),
            "Invalid destination"
        );
    }

    function setValidRoute(
        address[] calldata _locations,
        bool isValid
    ) external onlyRole(VALID_ROUTE_SETTER) {
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

    //High gas usage, view only
    function viewOnly_getAllValidSources()
        external
        view
        override
        returns (address[] memory locations_)
    {
        locations_ = validSources.values();
    }

    function getValidSourceCount() external view override returns (uint256) {
        return validSources.length();
    }

    function getValidSourceAt(
        uint256 _i
    ) external view override returns (address) {
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

    function getValidDestinationCount()
        external
        view
        override
        returns (uint256)
    {
        return validDestinations.length();
    }

    function getValidDestinationAt(
        uint256 _i
    ) external view override returns (address) {
        return validDestinations.at(_i);
    }
}
