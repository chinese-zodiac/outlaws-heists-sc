// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {UD60x18, convert, ud, frac} from "./prb-math/UD60x18.sol";

contract OutlawAdventures is AccessControlEnumerable {
    struct AdventureType {
        uint256 id;
        string metadata;
        UD60x18 rewardMin;
        UD60x18 rewardMax;
        uint32 duration;
        uint8 outlawCountRequirement;
        EnumerableMap.AddressToUintMap tokenCosts;
    }

}
