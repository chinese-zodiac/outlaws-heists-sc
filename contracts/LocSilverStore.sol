// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./LocationBase.sol";
import "./Gangs.sol";
import "./EntityStoreERC20.sol";
import "./EntityStoreERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract LocSilverStore is LocationBase {
    using SafeERC20 for IERC20;

    Gangs public immutable gang;
    IERC721 public immutable ustsd;
    EntityStoreERC20 public immutable entityStoreERC20;
    EntityStoreERC721 public immutable entityStoreERC721;

    constructor(
        ILocationController _locationController,
        Gangs _gang,
        IERC721 _ustsd,
        EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721 _entityStoreERC721
    ) LocationBase(_locationController) {
        gang = _gang;
        ustsd = _ustsd;
        entityStoreERC20 = _entityStoreERC20;
        entityStoreERC721 = _entityStoreERC721;
        ustsd.setApprovalForAll(address(entityStoreERC721), true);
    }

    function depositAndWithdrawUstsd(
        uint256 _gangId,
        uint256[] calldata _idsToDeposit,
        uint256[] calldata _idsToWithdraw
    ) public {
        depositUstsd(_gangId, _idsToDeposit);
        withdrawUstsd(_gangId, _idsToWithdraw);
    }

    function depositUstsd(uint256 _gangId, uint256[] calldata _ids) public {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        for (uint i; i < _ids.length; i++) {
            ustsd.transferFrom(msg.sender, address(this), _ids[i]);
        }
        entityStoreERC721.deposit(gang, _gangId, ustsd, _ids);
    }

    function withdrawUstsd(uint256 _gangId, uint256[] calldata _ids) public {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        entityStoreERC721.withdraw(gang, _gangId, ustsd, _ids);
        for (uint i; i < _ids.length; i++) {
            ustsd.transferFrom(address(this), msg.sender, _ids[i]);
        }
    }
}
