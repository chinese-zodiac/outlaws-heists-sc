// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IBooster.sol";

//WARNING: Setting too many IBooster for a keyHash could make the gas cost explode
contract BoostedValueCalculator is AccessControlEnumerable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    bytes32 public constant BOOSTER_MANAGER = keccak256("BOOSTER_MANAGER");
    EnumerableSet.Bytes32Set keyHashes;
    mapping(bytes32 => EnumerableSet.AddressSet) boostersMul;
    mapping(bytes32 => EnumerableSet.AddressSet) boostersAdd;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BOOSTER_MANAGER, msg.sender);
    }

    modifier hasKeyHash(bytes32 keyHash) {
        require(keyHashes.contains(keyHash), "keyHash does not exist");
        _;
    }

    function getBoostedValue(
        ILocation at,
        bytes32 keyHash,
        IEntity entity,
        uint256 entityId
    ) external view hasKeyHash(keyHash) returns (uint256) {
        address[] memory additiveBoosters = getAllBoostersAdd(keyHash);
        uint256 basePower;
        for (uint i; i < additiveBoosters.length; i++) {
            basePower += IBooster(additiveBoosters[i]).getBoost(
                at,
                entity,
                entityId
            );
        }
        address[] memory multiplicativeBoosters = getAllBoostersMul(keyHash);
        uint256 multiplierBasisPoints;
        for (uint i; i < multiplicativeBoosters.length; i++) {
            multiplierBasisPoints += IBooster(multiplicativeBoosters[i])
                .getBoost(at, entity, entityId);
        }
        return (basePower * multiplierBasisPoints) / 10000;
    }

    function getAllBoostersMul(
        bytes32 keyHash
    ) public view hasKeyHash(keyHash) returns (address[] memory boosters) {
        boosters = boostersMul[keyHash].values();
    }

    function getBoostersMulCount(
        bytes32 keyHash
    ) public view hasKeyHash(keyHash) returns (uint256) {
        return boostersMul[keyHash].length();
    }

    function getBoostersMulAt(
        bytes32 keyHash,
        uint256 _i
    ) public view hasKeyHash(keyHash) returns (address) {
        return boostersMul[keyHash].at(_i);
    }

    function setBoostersMul(
        bytes32 keyHash,
        IBooster[] calldata _boosters,
        bool isValid
    ) public onlyRole(BOOSTER_MANAGER) {
        if (isValid) {
            for (uint i; i < _boosters.length; i++) {
                boostersMul[keyHash].add(address(_boosters[i]));
            }
        } else {
            for (uint i; i < _boosters.length; i++) {
                boostersMul[keyHash].remove(address(_boosters[i]));
            }
        }
        if (boostersMul[keyHash].length() + boostersAdd[keyHash].length() > 0) {
            keyHashes.add(keyHash);
        } else {
            keyHashes.remove(keyHash);
        }
    }

    function getAllBoostersAdd(
        bytes32 keyHash
    ) public view hasKeyHash(keyHash) returns (address[] memory boosters) {
        boosters = boostersAdd[keyHash].values();
    }

    function getBoostersAddCount(
        bytes32 keyHash
    ) public view hasKeyHash(keyHash) returns (uint256) {
        return boostersAdd[keyHash].length();
    }

    function getBoostersAddAt(
        bytes32 keyHash,
        uint256 _i
    ) public view hasKeyHash(keyHash) returns (address) {
        return boostersAdd[keyHash].at(_i);
    }

    function setBoostersAdd(
        bytes32 keyHash,
        IBooster[] calldata _boosters,
        bool isValid
    ) public onlyRole(BOOSTER_MANAGER) {
        if (isValid) {
            for (uint i; i < _boosters.length; i++) {
                boostersAdd[keyHash].add(address(_boosters[i]));
            }
        } else {
            for (uint i; i < _boosters.length; i++) {
                boostersAdd[keyHash].remove(address(_boosters[i]));
            }
        }
        if (boostersMul[keyHash].length() + boostersAdd[keyHash].length() > 0) {
            keyHashes.add(keyHash);
        } else {
            keyHashes.remove(keyHash);
        }
    }

    function getAllKeyHashes() public view returns (bytes32[] memory) {
        return keyHashes.values();
    }

    function getKeyHashesCount() public view returns (uint256) {
        return keyHashes.length();
    }

    function getKeyHashesAt(uint256 _i) public view returns (bytes32) {
        return keyHashes.at(_i);
    }
}
