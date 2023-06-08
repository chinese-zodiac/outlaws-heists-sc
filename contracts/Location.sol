// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/ILocation.sol";
import "./interfaces/IEntity.sol";
import "./MetadataCid.sol";

contract Location is AccessControlEnumerable, MetadataCid, ILocation {
    using EnumerableSet for EnumerableSet.UintSet;

    //Action role should be assigned to smart contracts that implement actions for and/or on local entities
    //For instance, actions might include movement, combat, or training.
    //Actions are not pure functions as they may contain internal state (for instance when moving, it may require three stages, prepare, embark, and arrive)
    bytes32 public constant ACTION_ROLE = keccak256("ACTION_ROLE");

    //FOR INDEXING ONLY - location reverts are done in IEntity.executeCall and IEntity.move
    mapping(IEntity => EnumerableSet.UintSet) entitiesIndex;

    constructor(string memory _ipfsMetadataCid) MetadataCid(_ipfsMetadataCid) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function actionExecute(
        IEntity _entityContract,
        uint256 _nftId,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external payable onlyRole(ACTION_ROLE) returns (bytes memory result) {
        require(
            _entityContract.location(_nftId) == address(this),
            "Can only execute actions on local entities"
        );
        return _entityContract.executeCall(_nftId, _to, _value, _data);
    }

    function indexAdd(IEntity _entityContract, uint256 _nftId) external {
        require(
            _entityContract.location(_nftId) == address(this),
            "Entity must be at location before updating index"
        );
        require(
            !entitiesIndex[_entityContract].contains(_nftId),
            "Entity already in index"
        );
        entitiesIndex[_entityContract].add(_nftId);
    }

    function indexRemove(IEntity _entityContract, uint256 _nftId) external {
        require(
            _entityContract.location(_nftId) != address(this),
            "Entity must not be at location before updating index"
        );
        require(
            entitiesIndex[_entityContract].contains(_nftId),
            "Entity not in index"
        );
        entitiesIndex[_entityContract].remove(_nftId);
    }

    //High gas usage, view only
    function viewOnly_getAllLocalEntitiesFor(IEntity _entityContract)
        external
        view
        override
        returns (
            uint256[] memory entityIds_,
            address[] memory boundWallets_,
            address[] memory owners_
        )
    {
        entityIds_ = entitiesIndex[_entityContract].values();
    }

    function getLocalEntityCountFor(IEntity _entityContract)
        public
        view
        override
        returns (uint256)
    {
        return entitiesIndex[_entityContract].length();
    }

    function getLocalEntityAtIndexFor(IEntity _entityContract, uint256 _i)
        public
        view
        override
        returns (
            uint256 nftId_,
            address boundAccount_,
            address owner_
        )
    {
        nftId_ = entitiesIndex[_entityContract].at(_i);
        boundAccount_ = _entityContract.boundAccount(nftId_);
        owner_ = _entityContract.ownerOf(nftId_);
    }
}
