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
    using EnumerableSet for EnumerableSet.AddressSet;
    bytes32 public constant VALID_ASSET_SETTER =
        keccak256("VALID_ASSET_SETTER");

    Gangs public immutable gang;
    EntityStoreERC20 public immutable entityStoreERC20;
    EntityStoreERC721 public immutable entityStoreERC721;

    EnumerableSet.AddressSet validAssets;

    constructor(
        ILocationController _locationController,
        Gangs _gang,
        EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721 _entityStoreERC721
    ) LocationBase(_locationController) {
        _grantRole(VALID_ASSET_SETTER, msg.sender);
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
        require(validAssets.contains(address(_token)), "Invalid asset");
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
        require(validAssets.contains(address(_token)), "Invalid asset");
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
        require(validAssets.contains(address(_nft)), "Invalid asset");
        for (uint i; i < _ids.length; i++) {
            _nft.transferFrom(msg.sender, address(this), _ids[i]);
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
        require(validAssets.contains(address(_nft)), "Invalid asset");
        entityStoreERC721.withdraw(_gang, _gangId, _nft, _ids);
        for (uint i; i < _ids.length; i++) {
            _nft.transferFrom(address(this), msg.sender, _ids[i]);
        }
    }

    function setValidAssets(
        address[] calldata _assets,
        bool isValid
    ) external onlyRole(VALID_ENTITY_SETTER) {
        if (isValid) {
            for (uint i; i < _assets.length; i++) {
                validAssets.add(_assets[i]);
            }
        } else {
            for (uint i; i < _assets.length; i++) {
                validAssets.remove(_assets[i]);
            }
        }
    }

    //High gas usage, view only
    function viewOnly_getAllValidAssets()
        external
        view
        returns (address[] memory assets_)
    {
        assets_ = validAssets.values();
    }

    function getValidAssetsCount() external view returns (uint256) {
        return validAssets.length();
    }

    function getValidAssetsAt(uint256 _i) external view returns (address) {
        return validAssets.at(_i);
    }
}
