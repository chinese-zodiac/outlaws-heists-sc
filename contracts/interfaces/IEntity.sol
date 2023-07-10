// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Credit to Pancakeswap
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IEntity is IERC721Enumerable {
    function burn(uint256 tokenId) external;
}
