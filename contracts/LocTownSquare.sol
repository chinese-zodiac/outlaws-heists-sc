// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./LocationBase.sol";
import "./Gangs.sol";
import "./EntityStoreERC20.sol";
import "./EntityStoreERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LocTownSquare is LocationBase {
    using SafeERC20 for IERC20;

    Gangs public immutable gang;
    EntityStoreERC20 public immutable entityStoreERC20;
    EntityStoreERC721 public immutable entityStoreERC721;

    constructor(
        ILocationController _locationController,
        Gangs _gang,
        EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721 _entityStoreERC721
    ) LocationBase(_locationController) {
        gang = _gang;
        entityStoreERC20 = _entityStoreERC20;
        entityStoreERC721 = _entityStoreERC721;
    }

    function spawnGang() external {
        gang.mint(msg.sender, ILocation(this));
    }

    function depositErc20(
        Gangs _gang,
        uint256 _gangId,
        IERC20 _token,
        uint256 _wad
    ) external {
        require(msg.sender == _gang.ownerOf(_gangId), "Only gang owner");
        _token.safeTransferFrom(msg.sender, address(this), _wad);
        _token.approve(address(entityStoreERC20), _wad);
        entityStoreERC20.deposit(
            _gang,
            _gangId,
            _token,
            _token.balanceOf(address(this))
        );
    }

    function withdrawErc20(
        Gangs _gang,
        uint256 _gangId,
        IERC20 _token,
        uint256 _wad
    ) external {
        require(msg.sender == _gang.ownerOf(_gangId), "Only gang owner");
        entityStoreERC20.withdraw(_gang, _gangId, _token, _wad);
        _token.safeTransfer(msg.sender, _token.balanceOf(address(this)));
    }

    function depositErc721(
        Gangs _gang,
        uint256 _gangId,
        IERC721 _nft,
        uint256[] calldata _ids
    ) external {
        require(msg.sender == _gang.ownerOf(_gangId), "Only gang owner");
        for (uint i; i < _ids.length; i++) {
            _nft.safeTransferFrom(msg.sender, address(this), _ids[i]);
        }
        if (!_nft.isApprovedForAll(address(this), address(entityStoreERC721))) {
            _nft.setApprovalForAll(address(entityStoreERC721), true);
        }
        entityStoreERC721.deposit(_gang, _gangId, _nft, _ids);
    }

    function withdrawErc721(
        Gangs _gang,
        uint256 _gangId,
        IERC721 _nft,
        uint256[] calldata _ids
    ) external {
        require(msg.sender == _gang.ownerOf(_gangId), "Only gang owner");
        entityStoreERC721.withdraw(_gang, _gangId, _nft, _ids);
        for (uint i; i < _ids.length; i++) {
            _nft.safeTransferFrom(address(this), msg.sender, _ids[i]);
        }
    }
}
