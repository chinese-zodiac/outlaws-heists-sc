// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./BoundNftAccount.sol";
import "./interfaces/IEntity.sol";
import "./interfaces/ILocation.sol";
import "./MetadataCid.sol";

contract Entity is
    IEntity,
    AccessControlEnumerable,
    MetadataCid,
    ERC721Enumerable,
    ERC721Burnable
{
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    Counters.Counter private _tokenIdTracker;

    mapping(uint256 => address) public boundAccount;

    mapping(uint256 => address) public location;

    constructor(
        string memory name,
        string memory symbol,
        string memory _ipfsMetadataCid
    ) ERC721(name, symbol) MetadataCid(_ipfsMetadataCid) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function mint(address _to, address _location) public {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "JNT: must have manager role to mint"
        );

        // We cannot just use balanceOf to create the new tokenId because tokens
        // can be burned (destroyed), so we need a separate counter.
        uint256 newTokenId = _tokenIdTracker.current();
        _mint(_to, newTokenId);

        //Create and bind new BoundNftAccount
        BoundNftAccount newBoundAccount = new BoundNftAccount(
            IERC721(address(this)),
            newTokenId
        );
        boundAccount[newTokenId] = address(newBoundAccount);

        //set location
        location[newTokenId] = _location;
        ILocation(_location).indexAdd(IEntity(this), newTokenId);

        _tokenIdTracker.increment();
    }

    function move(uint256 _nftId, address _to) external {
        require(msg.sender == location[_nftId], "Not current location");
        address originalLocation = location[_nftId];
        location[_nftId] = _to;

        ILocation(originalLocation).indexRemove(IEntity(this), _nftId);
        ILocation(_to).indexAdd(IEntity(this), _nftId);
    }

    function executeCall(
        uint256 _nftId,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external payable returns (bytes memory result) {
        require(msg.sender == location[_nftId], "Not current location");
        return
            BoundNftAccount(boundAccount[_nftId]).executeCall(
                _to,
                _value,
                _data
            );
    }

    function burn(uint256 _nftId)
        public
        virtual
        override(IEntity, ERC721Burnable)
    {
        //TODO: Update index on both sending location and receiving location
        delete location[_nftId];
        ERC721Burnable.burn(_nftId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721Enumerable, ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Enumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._beforeTokenTransfer(
            from,
            to,
            firstTokenId,
            batchSize
        );
    }
}
