// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

//@dev Mock: Do not deploy publicly
contract RngHistoryMock {
    uint256 public lastRequest;
    uint256 public requestFee = 0 ether;

    function setRandomWord(uint256 to) external {
        lastRequest = to;
    }

    function requestRandomWord() external payable {}

    function getAtOrAfterTimestamp(
        uint64 timestamp
    ) external view returns (uint256) {
        return lastRequest;
    }

    function latest() external view returns (uint256) {
        return lastRequest;
    }
}
