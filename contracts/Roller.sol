// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import {UD60x18, convert, ud, frac} from "./prb-math/UD60x18.sol";

contract Roller {
    function getUniformRoll(
        bytes32 _randWord,
        UD60x18 _min,
        UD60x18 _max
    ) external pure returns (UD60x18 res_) {
        return frac(ud(uint256(_randWord))).mul(_max.sub(_min)).add(_min);
    }

    function getBiasRoll(
        bytes32 _randWord,
        UD60x18 _min,
        UD60x18 _max,
        UD60x18 _bias
    ) external pure returns (UD60x18 res_) {
        return
            frac(ud(uint256(_randWord))).pow(_bias).mul(_max.sub(_min)).add(
                _min
            );
    }
}
