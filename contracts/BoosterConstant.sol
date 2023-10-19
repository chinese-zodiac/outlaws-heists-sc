// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./interfaces/IBooster.sol";
import "./interfaces/IEntity.sol";

contract BoosterConstant is IBooster {
    uint256 public immutable value;

    constructor(uint256 _value) {
        value = _value;
    }

    function getBoost(
        ILocation,
        IEntity,
        uint256
    ) external view returns (uint256 boost) {
        return value;
    }
}
