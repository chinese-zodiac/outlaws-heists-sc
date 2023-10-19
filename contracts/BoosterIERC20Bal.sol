// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "./interfaces/IBooster.sol";
import "./EntityStoreERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BoosterIERC20Bal is IBooster {
    IERC20 public immutable token;
    EntityStoreERC20 public immutable entityStoreERC20;
    //Multiples bps by bal then divides by 10,000 ether. 10x is 100,000 bps, 100% is 10,000 bps, and 1% is 100 bps.
    uint256 public immutable bps;

    constructor(
        IERC20 _token,
        EntityStoreERC20 _entityStoreERC20,
        uint256 _bps
    ) {
        token = _token;
        entityStoreERC20 = _entityStoreERC20;
        bps = _bps;
    }

    function getBoost(
        ILocation,
        IEntity entity,
        uint256 entityId
    ) external view returns (uint256 boost) {
        return
            (entityStoreERC20.getStoredER20WadFor(entity, entityId, token) *
                bps) / 10000;
    }
}
