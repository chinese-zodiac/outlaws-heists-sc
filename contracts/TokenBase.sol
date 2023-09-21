// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IERC20MetadataLogo.sol";
import "./libs/AmmLibrary.sol";
import "./interfaces/IAmmFactory.sol";
import "./interfaces/IAmmPair.sol";

contract TokenBase is
    AccessControlEnumerable,
    ERC20PresetMinterPauser,
    IERC20MetadataLogo
{
    using SafeERC20 for IERC20;
    mapping(address => bool) public isExempt;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    string public logoUri;
    IAmmPair public ammCzusdPair;

    uint256 public buyBurnBps = 75;
    uint256 public sellBurnBps = 450;
    uint256 public maxBurnBps = 10000;

    constructor(
        address admin,
        address czusd,
        IAmmFactory ammFactory,
        string memory name,
        string memory ticker
    ) ERC20PresetMinterPauser(name, ticker) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        ammCzusdPair = IAmmPair(
            ammFactory.createPair(address(this), address(czusd))
        );
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        //Handle burn
        if (
            //No tax for exempt
            isExempt[sender] ||
            isExempt[recipient] ||
            //No tax if not a trade
            (sender != address(ammCzusdPair) &&
                recipient != address(ammCzusdPair))
        ) {
            super._transfer(sender, recipient, amount);
        } else {
            uint256 totalBurnFee;
            //sell fee
            if (recipient == address(ammCzusdPair)) {
                totalBurnFee += (amount * sellBurnBps) / 10000;
            }
            //buy fee
            if (sender == address(ammCzusdPair)) {
                totalBurnFee += (amount * buyBurnBps) / 10000;
            }
            if (totalBurnFee > 0) super._burn(sender, totalBurnFee);
            super._transfer(sender, recipient, amount - totalBurnFee);
        }
    }

    function setBurnBps(
        uint256 _onBuy,
        uint256 _onSell
    ) public onlyRole(MANAGER_ROLE) {
        buyBurnBps = _onBuy;
        sellBurnBps = _onSell;
    }

    function setIsExempt(address _for, bool _to) public onlyRole(MANAGER_ROLE) {
        isExempt[_for] = _to;
    }

    function setLogoUri(
        string calldata ipfsCid
    ) external onlyRole(MANAGER_ROLE) {
        logoUri = string.concat("ipfs://", ipfsCid);
    }

    function setAmmPair(IAmmPair _to) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ammCzusdPair = _to;
    }

    function setMaxBurnBps(uint256 _to) public onlyRole(DEFAULT_ADMIN_ROLE) {
        maxBurnBps = _to;
    }

    function recoverERC20(
        address tokenAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(tokenAddress).safeTransfer(
            _msgSender(),
            IERC20(tokenAddress).balanceOf(address(this))
        );
    }
}
