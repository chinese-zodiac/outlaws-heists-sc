// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;
import "./ILocation.sol";

interface ILocationController {
    //Moves entity from current location to new location.
    //Must call LOCATION_CONTROLLER_onDeparture for old ILocation
    //Must call LOCATION_CONTROLLER_onArrival for new ILocation
    function move(
        IEntity _entityContract,
        uint256 _nftId,
        ILocation _dest
    ) external;

    //Must call LOCATION_CONTROLLER_onArrival for new ILocation
    function register(
        IEntity _entityContract,
        uint256 _nftId,
        ILocation _dest
    ) external;

    //Must call LOCATION_CONTROLLER_onDeparture for old ILocation
    function unregister(IEntity _entityContract, uint256 _nftId) external;

    //High gas usage, view only
    function viewOnly_getAllLocalEntitiesFor(
        ILocation _location,
        IEntity _entityContract
    )
        external
        view
        returns (
            uint256[] memory entityIds_,
            address[] memory boundWallets_,
            address[] memory owners_
        );

    function getEntityLocation(IEntity _entityContract, uint256 _nftId)
        external
        view
        returns (ILocation);

    function getLocalEntityCountFor(
        ILocation _location,
        IEntity _entityContract
    ) external view returns (uint256);

    function getLocalEntityAtIndexFor(
        ILocation _location,
        IEntity _entityContract,
        uint256 _i
    )
        external
        view
        returns (
            uint256 nftId_,
            address boundAccount_,
            address owner_
        );
}
