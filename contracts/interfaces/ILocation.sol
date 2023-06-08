// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;
import "./IEntity.sol";

interface ILocation {
    function indexAdd(IEntity _entityContract, uint256 _nftId) external;

    function indexRemove(IEntity _entityContract, uint256 _nftId) external;

    function viewOnly_getAllLocalEntitiesFor(IEntity _entityContract)
        external
        view
        returns (
            uint256[] memory entityIds_,
            address[] memory boundWallets_,
            address[] memory owners_
        );

    function getLocalEntityCountFor(IEntity _entityContract)
        external
        view
        returns (uint256);

    function getLocalEntityAtIndexFor(IEntity _entityContract, uint256 _i)
        external
        view
        returns (
            uint256 nftId_,
            address boundAccount_,
            address owner_
        );

    function actionExecute(
        IEntity _entityContract,
        uint256 _nftId,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external payable returns (bytes memory result);
}
