// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "./Entity.sol";
import "./interfaces/ILocationController.sol";

contract Gangs is Entity {
    constructor(
        ILocationController _locationController
    ) Entity("Outlaw Gangs", "GANG", _locationController) {}
}
