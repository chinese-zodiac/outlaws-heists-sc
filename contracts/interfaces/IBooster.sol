// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./ILocation.sol";
import "./IEntity.sol";

interface IBooster {
    function getBoost(
        ILocation location,
        IEntity entity,
        uint256 entityId
    ) external view returns (uint256 boost);
}
