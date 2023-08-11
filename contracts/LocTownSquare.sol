// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./LocationBase.sol";
import "./Gangs.sol";
import "./EntityStoreERC20.sol";
import "./EntityStoreERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract LocTownSquare is LocationBase {
    using SafeERC20 for IERC20;

    Gangs public immutable gang;
    IERC20 public immutable bandits;
    IERC721 public immutable outlaws;
    EntityStoreERC20 public immutable entityStoreERC20;
    EntityStoreERC721 public immutable entityStoreERC721;

    constructor(
        ILocationController _locationController,
        Gangs _gang,
        IERC20 _bandits,
        IERC721 _outlaws,
        EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721 _entityStoreERC721
    ) LocationBase(_locationController) {
        gang = _gang;
        bandits = _bandits;
        outlaws = _outlaws;
        entityStoreERC20 = _entityStoreERC20;
        entityStoreERC721 = _entityStoreERC721;
        outlaws.setApprovalForAll(address(entityStoreERC721), true);
        bandits.approve(address(entityStoreERC20), type(uint256).max);
    }

    function spawnGang() public {
        gang.mint(msg.sender, ILocation(this));
    }

    function spawnGangWithOutlaws(uint256[] calldata _ids) external {
        uint256 id = gang.mint(msg.sender, ILocation(this));
        depositOutlaws(id, _ids);
    }

    function depositBandits(uint256 _gangId, uint256 _wad) external {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        bandits.safeTransferFrom(msg.sender, address(this), _wad);
        entityStoreERC20.deposit(
            gang,
            _gangId,
            bandits,
            bandits.balanceOf(address(this))
        );
    }

    function withdrawBandits(uint256 _gangId, uint256 _wad) external {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        entityStoreERC20.withdraw(gang, _gangId, bandits, _wad);
        bandits.safeTransfer(msg.sender, bandits.balanceOf(address(this)));
    }

    function depositAndWithdrawOutlaws(
        uint256 _gangId,
        uint256[] calldata _idsToDeposit,
        uint256[] calldata _idsToWithdraw
    ) public {
        depositOutlaws(_gangId, _idsToDeposit);
        withdrawOutlaws(_gangId, _idsToWithdraw);
    }

    function depositOutlaws(uint256 _gangId, uint256[] calldata _ids) public {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        for (uint i; i < _ids.length; i++) {
            outlaws.transferFrom(msg.sender, address(this), _ids[i]);
        }
        entityStoreERC721.deposit(gang, _gangId, outlaws, _ids);
    }

    function withdrawOutlaws(uint256 _gangId, uint256[] calldata _ids) public {
        require(msg.sender == gang.ownerOf(_gangId), "Only gang owner");
        entityStoreERC721.withdraw(gang, _gangId, outlaws, _ids);
        for (uint i; i < _ids.length; i++) {
            outlaws.transferFrom(address(this), msg.sender, _ids[i]);
        }
    }
}
