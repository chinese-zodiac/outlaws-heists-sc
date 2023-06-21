// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/ILocation.sol";
import "./interfaces/ILocationController.sol";

//Permisionless EntityStoreERC20
//Deposit/withdraw/transfer tokens that are stored to a particular entity
//deposit/withdraw/transfers are restricted to the entity's current location.
contract EntityStoreERC20 {
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeERC20 for IERC20;

    mapping(IERC721 => mapping(uint256 => mapping(IERC20 => uint256))) entityStoredERC20Shares;
    //Neccessary for rebasing, tax, liquid staking, or other tokens
    //that may directly modify this contract's balance.
    mapping(IERC20 => uint256) public totalShares;
    //Initial precision for shares per token
    uint256 constant SHARES_PRECISION = 10 ** 8;

    ILocationController public immutable locationController;

    modifier onlyEntitysLocation(IERC721 _entity, uint256 _entityId) {
        require(
            msg.sender ==
                address(
                    locationController.getEntityLocation(_entity, _entityId)
                ),
            "Only entity's location"
        );
        _;
    }

    constructor(ILocationController _locationController) {
        locationController = _locationController;
    }

    function deposit(
        IERC721 _entity,
        uint256 _entityId,
        IERC20 _token,
        uint256 _wad
    ) external onlyEntitysLocation(_entity, _entityId) {
        address depositor = _entity.ownerOf(_entityId);
        uint256 initialTokens = _token.balanceOf(address(this));
        uint256 sharesPerToken = totalShares[_token] / initialTokens;
        //Initialize shares per token to be SHARES_PRECISION
        if (sharesPerToken == 0) sharesPerToken = SHARES_PRECISION;
        _token.safeTransferFrom(depositor, address(this), _wad);
        //May be different than _wad due to transfer tax/burn
        uint256 deltaTokens = _token.balanceOf(address(this)) - initialTokens;
        uint256 newShares = deltaTokens * sharesPerToken;
        entityStoredERC20Shares[_entity][_entityId][_token] += newShares;
        totalShares[_token] += newShares;
    }

    function withdraw(
        IERC721 _entity,
        uint256 _entityId,
        IERC20 _token,
        uint256 _shares
    ) external onlyEntitysLocation(_entity, _entityId) {
        address depositor = _entity.ownerOf(_entityId);
        uint256 sharesPerToken = totalShares[_token] /
            _token.balanceOf(address(this));
        entityStoredERC20Shares[_entity][_entityId][_token] -= _shares;
        totalShares[_token] -= _shares;
        _token.safeTransfer(
            depositor,
            (_shares * sharesPerToken) / SHARES_PRECISION
        );
    }

    function transfer(
        IERC721 _fromEntity,
        uint256 _fromEntityId,
        IERC721 _toEntity,
        uint256 _toEntityId,
        IERC20 _token,
        uint256 _shares
    )
        external
        onlyEntitysLocation(_fromEntity, _fromEntityId)
        onlyEntitysLocation(_toEntity, _toEntityId)
    {
        entityStoredERC20Shares[_fromEntity][_fromEntityId][_token] -= _shares;
        entityStoredERC20Shares[_toEntity][_toEntityId][_token] += _shares;
    }

    function getLocalER20SharesFor(
        IERC721 _entity,
        uint256 _entityId,
        IERC20 _token
    ) external view returns (uint256) {
        return entityStoredERC20Shares[_entity][_entityId][_token];
    }

    function getSharesPerToken(IERC20 _token) external view returns (uint256) {
        return totalShares[_token] / _token.balanceOf(address(this));
    }
}