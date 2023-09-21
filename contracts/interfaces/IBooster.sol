// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./ILocation.sol";

interface IBooster {
    function getBoost(
        ILocation location,
        uint256 gangId
    ) external view returns (uint256 boost);
}
