//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestCollectionERC721 is ERC721 {
    uint256 public tokenId;

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function mint() public {
        _mint(msg.sender, tokenId);
        tokenId++;
    }
}
