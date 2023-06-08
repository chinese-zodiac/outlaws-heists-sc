// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./sstore2/utils/Bytecode.sol";

contract BoundNftAccount {
    using Counters for Counters.Counter;

    uint256 public immutable boundNftId;
    IERC721 public immutable parentNftContract;

    constructor(IERC721 _parentNftContract, uint256 _boundNftId) {
        parentNftContract = _parentNftContract;
        boundNftId = _boundNftId;
    }

    Counters.Counter private _nonce;

    function executeCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result) {
        require(msg.sender == address(parentNftContract), "Not parent");

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        } else {
            _nonce.increment();
        }
    }

    function nonce() external view returns (uint256) {
        return _nonce.current();
    }
}
