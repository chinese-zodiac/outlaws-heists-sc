// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;
import "./IEntity.sol";

interface ILocation {
    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onArrival(
        IEntity _entityContract,
        uint256 _nftId
    ) external;

    function LOCATION_CONTROLLER_onDeparture(
        IEntity _entityContract,
        uint256 _nftId
    ) external;
}
