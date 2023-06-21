// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/ILocation.sol";
import "./interfaces/ILocationController.sol";

//Permisionless EntityStoreERC721
//Deposit/withdraw/transfer nfts that are stored to a particular entity
//deposit/withdraw/transfers are restricted to the entity's current location.
contract EntityStoreERC721 {
    using EnumerableSet for EnumerableSet.UintSet;

    mapping(IERC721 => mapping(uint256 => mapping(IERC721 => EnumerableSet.UintSet))) entityStoredERC721Ids;

    ILocationController public immutable locationController;

    modifier onlyEntitysLocation(IERC721 _entity, uint256 _entityId) {
        require(
            msg.sender ==
                address(
                    locationController.getEntityLocation(_entity, _entityId)
                ),
            "Only entity's location"
        );
        _;
    }

    constructor(ILocationController _locationController) {
        locationController = _locationController;
    }

    function deposit(
        IERC721 _entity,
        uint256 _entityId,
        IERC721 _nft,
        uint256[] calldata _nftIds
    ) external onlyEntitysLocation(_entity, _entityId) {
        address depositor = _entity.ownerOf(_entityId);
        for (uint i; i < _nftIds.length; i++) {
            _nft.transferFrom(depositor, address(this), _nftIds[i]);
            require(
                entityStoredERC721Ids[_entity][_entityId][_nft].add(_nftIds[i]),
                "Deposit failed"
            );
        }
    }

    function withdraw(
        IERC721 _entity,
        uint256 _entityId,
        IERC721 _nft,
        uint256[] calldata _nftIds
    ) external onlyEntitysLocation(_entity, _entityId) {
        address receiver = _entity.ownerOf(_entityId);
        for (uint i; i < _nftIds.length; i++) {
            _nft.transferFrom(address(this), receiver, _nftIds[i]);
            require(
                entityStoredERC721Ids[_entity][_entityId][_nft].remove(
                    _nftIds[i]
                ),
                "Withdraw failed"
            );
        }
    }

    function transfer(
        IERC721 _fromEntity,
        uint256 _fromEntityId,
        IERC721 _toEntity,
        uint256 _toEntityId,
        IERC721 _nft,
        uint256[] calldata _nftIds
    )
        external
        onlyEntitysLocation(_fromEntity, _fromEntityId)
        onlyEntitysLocation(_toEntity, _toEntityId)
    {
        for (uint i; i < _nftIds.length; i++) {
            require(
                entityStoredERC721Ids[_fromEntity][_fromEntityId][_nft].remove(
                    _nftIds[i]
                ),
                "Send failed"
            );
            require(
                entityStoredERC721Ids[_toEntity][_toEntityId][_nft].add(
                    _nftIds[i]
                ),
                "Receive failed"
            );
        }
    }

    function getLocalERC721CountFor(
        IERC721 _entity,
        uint256 _entityId,
        IERC721 _nft
    ) external view returns (uint256) {
        return entityStoredERC721Ids[_entity][_entityId][_nft].length();
    }
}