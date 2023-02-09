//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestCollectionERC1155 is ERC1155 {
    uint256 public tokenId;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri
    ) ERC1155(_uri) {}

    function mint(uint256 _amount) public {
        _mint(msg.sender, tokenId, _amount, "");
        tokenId++;
    }
}
