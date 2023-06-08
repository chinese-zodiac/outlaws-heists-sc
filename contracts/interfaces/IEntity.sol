// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IEntity is IERC721Enumerable {
    function boundAccount(uint256 _nftId)
        external
        view
        returns (address boundAccount_);

    function location(uint256 _nftId) external view returns (address location_);

    function burn(uint256 _nftId) external;

    function move(uint256 _nftId, address _to) external;

    function executeCall(
        uint256 _nftId,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external payable returns (bytes memory result);
}
