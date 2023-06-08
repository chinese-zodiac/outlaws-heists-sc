// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./Entity.sol";

contract Gangs is Entity {
    constructor(string memory _ipfsMetadataCid)
        Entity("Outlaw Gangs", "GANG", _ipfsMetadataCid)
    {}
}
