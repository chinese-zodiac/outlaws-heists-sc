// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./Entity.sol";
import "./interfaces/ILocationController.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Gangs is Entity, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    //Names are a uint16 number representing a word on seperate wordlists.
    //They are stored in a uint256 by bitshifting (storing in a smaller variable does not save gas)
    uint16 public gangNameWord1OptionsMax;
    uint16 public gangNameWord2OptionsMax;
    uint16 public gangNameWord3OptionsMax;

    EnumerableSet.UintSet gangNames;
    mapping(uint256 => uint256) public gangIdToName;

    constructor(
        ILocationController _locationController
    ) Entity("Outlaw Gangs", "GANG", _locationController) {}

    function mint(
        address _to,
        ILocation _location
    ) public override returns (uint256 id_) {
        id_ = Entity.mint(_to, _location);
        bytes32 roll1 = keccak256(
            abi.encodePacked(blockhash(block.number - 1), _to)
        );
        bytes32 roll2 = keccak256(abi.encodePacked(roll1));
        bytes32 roll3 = keccak256(abi.encodePacked(roll2));
        _setName(
            id_,
            uint16(uint256(roll1) % gangNameWord1OptionsMax),
            uint16(uint256(roll2) % gangNameWord2OptionsMax),
            uint16(uint256(roll3) % gangNameWord3OptionsMax)
        );
    }

    function setName(
        uint256 _gangId,
        uint16 word1,
        uint16 word2,
        uint16 word3
    ) external {
        require(msg.sender == ownerOf(_gangId), "Only owner can change name");
        _setName(_gangId, word1, word2, word3);
    }

    function _setName(
        uint256 _gangId,
        uint16 word1,
        uint16 word2,
        uint16 word3
    ) internal {
        require(word1 < gangNameWord1OptionsMax, "word1 above max");
        require(word2 < gangNameWord2OptionsMax, "word2 above max");
        require(word3 < gangNameWord3OptionsMax, "word3 above max");
        uint256 name = word1 + (uint256(word2) << 16) + (uint256(word3) << 32);
        require(gangNames.add(name), "Add name failed");
        gangIdToName[_gangId] = name;
    }

    function getName(
        uint256 _gangId
    ) external view returns (uint256 word1_, uint256 word2_, uint256 word3_) {
        uint256 name = gangIdToName[_gangId];
        word3_ = name >> 32;
        word2_ = (name >> 16) - (word3_ << 16);
        word1_ = name - (word3_ << 32) - (word2_ << 16);
    }

    function setMaxOptions(
        uint16 _gangNameWord1OptionsMax,
        uint16 _gangNameWord2OptionsMax,
        uint16 _gangNameWord3OptionsMax
    ) external onlyOwner {
        gangNameWord1OptionsMax = _gangNameWord1OptionsMax;
        gangNameWord2OptionsMax = _gangNameWord2OptionsMax;
        gangNameWord3OptionsMax = _gangNameWord3OptionsMax;
    }
}
