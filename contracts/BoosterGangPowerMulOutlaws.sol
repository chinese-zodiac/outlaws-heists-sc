// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBooster.sol";
import "./interfaces/ILocation.sol";
import "./EntityStoreERC721.sol";

contract BoosterGangPowerMulUSTSD is IBooster {
    IERC721 public immutable ustsd;
    IERC721 public immutable gang;
    EntityStoreERC721 public immutable entityStoreERC721;

    uint256 public constant boostPerUstsdBasis = 1000;

    constructor(
        IERC721 _ustsd,
        IERC721 _gang,
        EntityStoreERC721 _entityStoreERC721
    ) {
        ustsd = _ustsd;
        gang = _gang;
        entityStoreERC721 = _entityStoreERC721;
    }

    function getBoost(
        ILocation,
        uint256 gangId
    ) external view returns (uint256 boost) {
        return
            boostPerUstsdBasis *
            entityStoreERC721.getStoredERC721CountFor(gang, gangId, ustsd);
    }
}
