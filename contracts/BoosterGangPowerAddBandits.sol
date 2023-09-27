// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBooster.sol";
import "./interfaces/ILocation.sol";
import "./EntityStoreERC20.sol";

contract BoosterGangPowerAddBandits is IBooster {
    IERC20 public immutable bandit;
    IERC721 public immutable gang;
    EntityStoreERC20 public immutable entityStoreERC20;

    constructor(
        IERC20 _bandit,
        IERC721 _gang,
        EntityStoreERC20 _entityStoreERC20
    ) {
        bandit = _bandit;
        gang = _gang;
        entityStoreERC20 = _entityStoreERC20;
    }

    function getBoost(
        ILocation,
        uint256 gangId
    ) external view returns (uint256 boost) {
        return entityStoreERC20.getStoredER20WadFor(gang, gangId, bandit);
    }
}
