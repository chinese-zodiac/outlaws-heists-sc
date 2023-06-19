// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/interfaces/IERC721.sol";

interface ILocation {
    //Only callable by LOCATION_CONTROLLER
    function LOCATION_CONTROLLER_onArrival(
        IERC721 _entity,
        uint256 _nftId,
        ILocation _from
    ) external;

    function LOCATION_CONTROLLER_onDeparture(
        IERC721 _entity,
        uint256 _nftId,
        ILocation _to
    ) external;
}
