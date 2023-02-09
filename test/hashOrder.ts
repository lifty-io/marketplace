import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Marketplace, TestCollectionERC721 } from "../typechain";
import { Asset, AssetType, OrderType } from "./models";
import { createdMockedMatchOrder, populateMatchedOrdersWithProofsAndRootSignature, createBackendSignature } from "./utils";
import { expect } from "chai";

describe("Buy with askAny and bidAny", function () {
	let chainId: number;
	let marketplaceBeneficiary: SignerWithAddress;
	let signer: SignerWithAddress;
	let interactor: SignerWithAddress;
	let backendSigner: SignerWithAddress;
	let marketplace: Marketplace;
	let testCollectionAsk: TestCollectionERC721;
	let testCollectionBid: TestCollectionERC721;;
	let maxTokenIdOfERC721AndERC1155;
	let tx;

	beforeEach(async function () {
		const signers = await ethers.getSigners();
		chainId = 31337;

		marketplaceBeneficiary = signers[0];
		signer = signers[1];
		interactor = signers[2];
		backendSigner = signers[3];

		const Marketplace = await ethers.getContractFactory("Marketplace");
		marketplace = await Marketplace.connect(backendSigner).deploy(backendSigner.address);

		await marketplace.connect(backendSigner).changeFeesBeneficiary(marketplaceBeneficiary.address);
		await marketplace.changeMarketplaceCollectionFee("0x0000000000000000000000000000000000000000", 250, 250);

		await marketplace.deployed();

		const collectionName = "testCollection";
		const collectionSymbol = "TC";

		const TestCollection = await ethers.getContractFactory("TestCollectionERC721");

		testCollectionAsk = await TestCollection.connect(backendSigner).deploy(collectionName, collectionSymbol);
		await testCollectionAsk.deployed();


		testCollectionBid = await TestCollection.connect(backendSigner).deploy(collectionName, collectionSymbol);
		await testCollectionBid.deployed();

		maxTokenIdOfERC721AndERC1155 = 4;
		for (let i = 0; i < maxTokenIdOfERC721AndERC1155; i++) {
			tx = await testCollectionBid.connect(signer).mint();
			await tx.wait();

			tx = await testCollectionBid.connect(signer).setApprovalForAll(marketplace.address, true);
			await tx.wait();

			tx = await testCollectionAsk.connect(interactor).mint();
			await tx.wait();

			tx = await testCollectionAsk.connect(interactor).setApprovalForAll(marketplace.address, true);
			await tx.wait();
		}
	})

	it("Should create matchedOrder, create tree and proofs for it, change tokenID in bid and verify if it works with the changed tokenID", async function () {
		const ask = [
			new Asset(0, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionAsk.address),
		]

		const bid = [
			new Asset(0, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address),
		]

		let order = createdMockedMatchOrder(ask, bid, OrderType.SWAP, signer, false, true);
		order = (await populateMatchedOrdersWithProofsAndRootSignature([order], [order.hash()], signer))[0];

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [order.hash()], backendSigner);

		order.bid[0].id = 1;
		tx = await marketplace.connect(interactor).buy(
			[order],
			txExpirationDate,
			backendSignature,
			[order.hash()],
		)

		expect(await testCollectionAsk.ownerOf(0)).
			to.be.equal(signer.address);

		expect(await testCollectionBid.ownerOf(1)).
			to.be.equal(interactor.address);
	})

	it("Should create matchedOrder, create tree and proofs for it, change tokenID in ask and verify if it works with the changed tokenID", async function () {
		const ask = [
			new Asset(0, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionAsk.address),
		]

		const bid = [
			new Asset(0, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address),
		]

		let order = createdMockedMatchOrder(ask, bid, OrderType.SWAP, signer, true, false);
		order = (await populateMatchedOrdersWithProofsAndRootSignature([order], [order.hash()], signer))[0];

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [order.hash()], backendSigner);

		order.ask[0].id = 1;
		tx = await marketplace.connect(interactor).buy(
			[order],
			txExpirationDate,
			backendSignature,
			[order.hash()],
		)

		expect(await testCollectionAsk.ownerOf(1)).
			to.be.equal(signer.address);

		expect(await testCollectionBid.ownerOf(0)).
			to.be.equal(interactor.address);
	})
})