import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TransferHelper, TestCollectionERC1155, Marketplace } from "../typechain";
import { expect } from "chai";

describe("Transfer helper", function () {
    let transferHelper: TransferHelper
    let erc1155: TestCollectionERC1155
    let wallets: SignerWithAddress[];


	beforeEach(async function () {
        wallets = await ethers.getSigners();
        
        const TransferHelper = await ethers.getContractFactory("Marketplace");
        transferHelper = await TransferHelper.deploy(wallets[0].address);

        const ERC1155 = await ethers.getContractFactory("TestCollectionERC1155");
        erc1155 = await ERC1155.deploy(" ", " ", " ");

        erc1155.mint(10000);
        await erc1155.setApprovalForAll(transferHelper.address, true);
	})

	it("erc1155 transfer", async function () {
        await transferHelper.transfer(wallets[1].address, [{assetType: 3, collection: erc1155.address, id: 0, amount: 11}])

        expect(await erc1155.balanceOf(wallets[1].address, 0)).to.be.equal(11);
	})

    it("erc1155 transfer non zero token id", async function () {
        await erc1155.mint(11);
        await transferHelper.transfer(wallets[1].address, [{assetType: 3, collection: erc1155.address, id: 1, amount: 11}])

        expect(await erc1155.balanceOf(wallets[1].address, 1)).to.be.equal(11);
	})

    it("erc1155 transfer from third party should revert", async function () {
        const tx = transferHelper.connect(wallets[3]).transfer(wallets[1].address, [{assetType: 3, collection: erc1155.address, id: 0, amount: 11}])

        await expect(tx).to.be.reverted;
	})

    it("erc1155 transfer to self", async function () {
        const tx = await transferHelper.transfer(wallets[0].address, [{assetType: 3, collection: erc1155.address, id: 0, amount: 11}]);
        await tx.wait();

        expect(await erc1155.balanceOf(wallets[0].address, 0)).to.be.equal(10000);
	})


})