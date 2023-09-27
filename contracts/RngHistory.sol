// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@chainlink/contracts/src/v0.8/VRFV2WrapperConsumerBase.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./libs/CheckpointTimestamps.sol";
import "./interfaces/IAmmRouter02.sol";
import "./interfaces/IPegSwap.sol";

contract RngHistory is VRFV2WrapperConsumerBase, AccessControlEnumerable {
    using CheckpointTimestamps for CheckpointTimestamps.History;
    using SafeERC20 for IERC20;
    using Address for address;

    CheckpointTimestamps.History rngHistory;

    bool public _isRequestPending;
    address public constant LINK_TRADEABLE =
        address(0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD);
    address public constant LINK_PEGSWAP =
        address(0x1FCc3B22955e76Ca48bF025f1A6993685975Bb9e);
    address public constant LINK_WRAPPED =
        address(0x404460C6A5EdE2D891e8297795264fDe62ADBB75);
    AggregatorInterface public constant LINK_BNB_PRICE_AGGREGATOR =
        AggregatorInterface(0xB38722F6A608646a538E882Ee9972D15c86Fc597);
    IAmmRouter02 public constant PCS_ROUTER =
        IAmmRouter02(0x10ED43C718714eb63d5aA57B78B54704E256024E);

    uint256 public requestFee = 0.0025 ether;

    uint256 public requestsSinceLastRequest = 0;
    uint256 public requestsSinceLastRequestPrev = 0;

    uint256 public period = 4 hours;
    uint256 public lastRequest;

    uint256 public linkPerBnbMin = 1 ether;

    uint32 public callbackGasLimit = 350000;

    constructor()
        VRFV2WrapperConsumerBase(
            address(LINK_WRAPPED), //link
            address(0x721DFbc5Cfe53d32ab00A9bdFa605d3b8E1f3f42) //vrf v2
        )
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    receive() external payable {}

    //If you decide to use RngHistory's randomness, its recommended to have your users donate BNB for it here.
    //Otherwise, it might stop working.
    //The recommended donation will decrease when people donate for RngHistory more often.
    function queueRandomWord() external payable {
        uint256 fee = getRecommendedDonation();
        require(msg.value >= fee, "Not enough donation");
        requestsSinceLastRequest++;
    }

    function requestRandomWord() external payable {
        require(
            block.timestamp > lastRequest + period || msg.value >= requestFee,
            "Must wait for period or send full fee"
        );
        if (_isRequestPending) return;
        _isRequestPending = true;
        lastRequest = block.timestamp;
        requestsSinceLastRequestPrev = requestsSinceLastRequest;
        requestsSinceLastRequestPrev = 0;
        requestRandomness(
            callbackGasLimit, //callbackGasLimit,
            3, //requestConfirmations,
            1
        );
    }

    function convertContractBnbToLink() external {
        uint256 linkPerBnbWad = LINK_BNB_PRICE_AGGREGATOR.latestRound();
        require(linkPerBnbWad > linkPerBnbMin, "Below linkPerBnbMin");
        address[] memory path = new address[](2);
        path[0] = PCS_ROUTER.WETH();
        path[1] = address(LINK_TRADEABLE);
        uint256 sellWad = address(this).balance;
        PCS_ROUTER.swapExactETHForTokens{value: sellWad}(
            (90 * linkPerBnbWad * sellWad) / 100 ether, //amountOutMin, 10% slippage max
            path,
            address(this),
            block.timestamp
        );
        uint256 pegswapWad = IERC20(LINK_TRADEABLE).balanceOf(address(this));
        IERC20(LINK_TRADEABLE).approve(LINK_PEGSWAP, pegswapWad);
        IPegSwap(LINK_PEGSWAP).swap(pegswapWad, LINK_TRADEABLE, LINK_WRAPPED);
    }

    function getRecommendedDonation() public view returns (uint256) {
        return requestFee / (requestsSinceLastRequestPrev + 1);
    }

    /**
     * @dev Returns the first value at or after a given block timestamp. If a checkpoint is not available at that block, the closest one
     * before it is returned, or zero otherwise. Because the timestamp returned corresponds to that at the end of the
     * block, the requested block timestamp must be in the past, excluding the current block.
     */
    function getAtOrAfterTimestamp(
        uint64 timestamp
    ) external view returns (uint256) {
        return rngHistory.lowerLookup(timestamp);
    }

    /**
     * @dev Returns the first value at or before a given block timestamp. If a checkpoint is not available at that block, the closest one
     * before it is returned, or zero otherwise. Because the timestamp returned corresponds to that at the end of the
     * block, the requested block timestamp must be in the past, excluding the current block.
     */
    function getAtOrBeforeTimestamp(
        uint64 timestamp
    ) external view returns (uint256) {
        return rngHistory.upperLookup(timestamp);
    }

    /**
     * @dev Returns the value in the most recent checkpoint, or zero if there are no checkpoints.
     */
    function latest() external view returns (uint256) {
        return rngHistory.latest();
    }

    /**
     * @dev Returns whether there is a checkpoint in the structure (i.e. it is not empty), and if so the key and value
     * in the most recent checkpoint.
     */
    function latestCheckpoint()
        external
        view
        returns (bool exists, uint64 _timestamp, uint224 _value)
    {
        return rngHistory.latestCheckpoint();
    }

    /**
     * @dev Returns the count of checkpoints.
     */
    function length() external view returns (uint256) {
        return rngHistory.length();
    }

    function setFee(uint256 _to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        requestFee = _to;
    }

    function setPeriod(uint256 _to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        period = _to;
    }

    function setLinkPerBnbMin(
        uint256 _to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        linkPerBnbMin = _to;
    }

    function setCallbackGasLimit(
        uint32 _to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        callbackGasLimit = _to;
    }

    function recoverERC20(
        address tokenAddress,
        uint256 _wad
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(tokenAddress).safeTransfer(_msgSender(), _wad);
    }

    function recoverBnb() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        _isRequestPending = false;
        rngHistory.push(uint192(randomWords[0]));
    }

    function resetRequestPending() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _isRequestPending = false;
    }
}
