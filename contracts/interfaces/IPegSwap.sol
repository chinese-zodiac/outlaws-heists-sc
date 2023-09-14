// SPDX-License-Identifier: GPL-3.0
// Credit to Chainlink
pragma solidity ^0.8.4;

/**
 * @notice This contract provides a one-to-one swap between pairs of tokens. It
 * is controlled by an owner who manages liquidity pools for all pairs. Most
 * users should only interact with the swap, onTokenTransfer, and
 * getSwappableAmount functions.
 */
interface IPegSwap {
    /**
     * @notice exchanges the source token for target token
     * @param amount count of tokens being swapped
     * @param source the token that is being given
     * @param target the token that is being taken
     */
    function swap(uint256 amount, address source, address target) external;

    /**
     * @notice swap tokens in one transaction if the sending token supports ERC677
     * @param sender address that initially initiated the call to the source token
     * @param amount count of tokens sent for the swap
     * @param targetData address of target token encoded as a bytes array
     */
    function onTokenTransfer(
        address sender,
        uint256 amount,
        bytes calldata targetData
    ) external;

    /**
     * @notice returns the amount of tokens for a pair that are available to swap
     * @param source the token that is being given
     * @param target the token that is being taken
     * @return amount count of tokens available to swap
     */
    function getSwappableAmount(
        address source,
        address target
    ) external view returns (uint256 amount);
}
