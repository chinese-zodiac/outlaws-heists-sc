// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBooster.sol";
import "./interfaces/ILocation.sol";
import "./EntityStoreERC721.sol";
import "./czodiac/IOutlawsNft.sol";

contract BoosterOutlawSet is IBooster {
    IOutlawsNft public immutable outlaws;
    EntityStoreERC721 public immutable entityStoreERC721;

    enum SETS {
        SINGLE,
        DOUBLE,
        TRIPLE,
        QUAD,
        STRAIGHT
    }

    uint256[] public BOOSTS = [2500, 5000, 10000, 20000, 40000];

    constructor(IOutlawsNft _outlaws, EntityStoreERC721 _entityStoreERC721) {
        outlaws = _outlaws;
        entityStoreERC721 = _entityStoreERC721;
    }

    function getBoost(
        ILocation,
        IEntity gang,
        uint256 gangId
    ) external view returns (uint256 boost) {
        //there will never be more than 5 outlaws per gang, so using getAllStoredERC721 is OK
        uint256[] memory outlawIds = entityStoreERC721
            .viewOnly_getAllStoredERC721(gang, gangId, outlaws);
        uint256[] memory tokenCount = new uint256[](
            uint256(type(SETS).max) + 1
        );
        for (uint256 i; i < outlawIds.length; i++) {
            tokenCount[uint256(outlaws.nftToken(outlawIds[i]))]++;
        }

        if (
            tokenCount[uint256(IOutlawsNft.TOKEN.BOTTLE)] > 0 &&
            tokenCount[uint256(IOutlawsNft.TOKEN.CASINO)] > 0 &&
            tokenCount[uint256(IOutlawsNft.TOKEN.GUN)] > 0 &&
            tokenCount[uint256(IOutlawsNft.TOKEN.HORSE)] > 0 &&
            tokenCount[uint256(IOutlawsNft.TOKEN.SALOON)] > 0
        ) {
            return BOOSTS[uint256(SETS.STRAIGHT)];
        }

        if (
            tokenCount[uint256(IOutlawsNft.TOKEN.BOTTLE)] >= 4 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.CASINO)] >= 4 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.GUN)] >= 4 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.HORSE)] >= 4 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.SALOON)] >= 4
        ) {
            return BOOSTS[uint256(SETS.QUAD)];
        }

        if (
            tokenCount[uint256(IOutlawsNft.TOKEN.BOTTLE)] >= 3 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.CASINO)] >= 3 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.GUN)] >= 3 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.HORSE)] >= 3 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.SALOON)] >= 3
        ) {
            return BOOSTS[uint256(SETS.TRIPLE)];
        }

        if (
            tokenCount[uint256(IOutlawsNft.TOKEN.BOTTLE)] >= 2 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.CASINO)] >= 2 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.GUN)] >= 2 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.HORSE)] >= 2 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.SALOON)] >= 2
        ) {
            return BOOSTS[uint256(SETS.DOUBLE)];
        }

        if (
            tokenCount[uint256(IOutlawsNft.TOKEN.BOTTLE)] >= 1 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.CASINO)] >= 1 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.GUN)] >= 1 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.HORSE)] >= 1 ||
            tokenCount[uint256(IOutlawsNft.TOKEN.SALOON)] >= 1
        ) {
            return BOOSTS[uint256(SETS.SINGLE)];
        }

        return 0;
    }
}
