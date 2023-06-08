// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

// provides metadata via ipfs cid for UX rendering of this contract
contract MetadataCid is AccessControlEnumerable {
    bytes32 public constant CID_SETTER_ROLE = keccak256("CID_SETTER_ROLE");

    string public cid;

    constructor(string memory _ipfsMetadataCid) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(CID_SETTER_ROLE, _msgSender());
        cid = _ipfsMetadataCid;
    }

    function setIpfsCid(string calldata _to) public onlyRole(CID_SETTER_ROLE) {
        cid = _to;
    }

    function getIpfsCid() public view returns (string memory cid_) {
        return cid;
    }
}
