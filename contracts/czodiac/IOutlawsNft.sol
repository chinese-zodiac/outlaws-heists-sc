// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IOutlawsNft is IERC721Enumerable, IAccessControl {
    enum TOKEN {
        BOTTLE, //0
        CASINO, //1
        GUN, //2
        HORSE, //3
        SALOON //4
    }

    function nftToken(uint256 _id) external view returns (TOKEN token_);

    function nftGeneration(uint256 _id) external view returns (uint256 gen_);

    function tokenURI(uint256 _id) external view returns (string memory);

    function mint(address _to) external;

    function set(
        uint256 _nftId,
        TOKEN _token,
        uint32 _gen,
        string calldata _jsonIpfsHash
    ) external;
}
