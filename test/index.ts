import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Marketplace, TestCollectionERC1155, TestCollectionERC721, TestTokenERC20 } from "../typechain";
import { expect } from "chai";

describe("tests for other logic except buy", function () {
	let chainId: string;
	let marketplaceBeneficiary: SignerWithAddress;
	let signer: SignerWithAddress;
	let creator: SignerWithAddress;
	let interactor: SignerWithAddress;
	let backendSigner: SignerWithAddress;
	let marketplace: Marketplace;
	let testCollectionAsk: TestCollectionERC721;
	let testCollectionBid: TestCollectionERC721;;
	let testCollectionAskERC1155: TestCollectionERC1155;
	let testCollectionBidERC1155: TestCollectionERC1155;;
	let testToken: TestTokenERC20;
	let testTokenSecond: TestTokenERC20;
	let tx;

	beforeEach(async function () {
		const signers = await ethers.getSigners();
		chainId = "1";

		marketplaceBeneficiary = signers[0];
		signer = signers[1];
		interactor = signers[2];
		backendSigner = signers[3];
		creator = signers[4];

		const Marketplace = await ethers.getContractFactory("Marketplace");
		marketplace = await Marketplace.connect(backendSigner).deploy(marketplaceBeneficiary.address);
		await marketplace.deployed();

		const collectionName = "testCollection";
		const collectionSymbol = "TC";

		const TestCollection = await ethers.getContractFactory("TestCollectionERC721");

		testCollectionAsk = await TestCollection.connect(backendSigner).deploy(collectionName, collectionSymbol);
		await testCollectionAsk.deployed();


		testCollectionBid = await TestCollection.connect(creator).deploy(collectionName, collectionSymbol);
		await testCollectionBid.deployed();

		const testTokenName = "testToken";
		const testTokenSymbol = "TT";

		const TestToken = await ethers.getContractFactory("TestTokenERC20");
		testToken = await TestToken.connect(backendSigner).deploy(testTokenName, testTokenSymbol);
		await testToken.deployed();

		const contractURI = "example.com";
		const TestCollectionERC1155 = await ethers.getContractFactory("TestCollectionERC1155");
		testCollectionAskERC1155 = await TestCollectionERC1155.deploy(testTokenName, testTokenSymbol, contractURI);
		testCollectionBidERC1155 = await TestCollectionERC1155.deploy(testTokenName, testTokenSymbol, contractURI);

		testTokenSecond = await TestToken.connect(backendSigner).deploy(testTokenName, testTokenSymbol);
		await testTokenSecond.deployed();
	})

	it("Change fees Beneficiary", async function () {
		let newBeneficiary = (await ethers.getSigners())[4];
		tx = await marketplace.connect(backendSigner).changeFeesBeneficiary(newBeneficiary.address);
		await tx.wait();

		expect(await marketplace.getFeesBeneficiary())
			.equal(newBeneficiary.address);
	})

	it("Change fees Beneficiary and be reveted", async function () {
		await expect(marketplace.connect(interactor).changeFeesBeneficiary(ethers.constants.AddressZero))
			.to.be.revertedWith("Ownable: caller is not the owner");
	})

	it("Change marketplace collection fee", async function () {
		await expect(marketplace.connect(interactor).changeMarketplaceCollectionFee(ethers.constants.AddressZero, ethers.BigNumber.from(500), ethers.BigNumber.from(500)))
			.to.be.revertedWith("Ownable: caller is not the owner");

		await expect(marketplace.connect(backendSigner).changeMarketplaceCollectionFee(ethers.constants.AddressZero, ethers.BigNumber.from(500), ethers.BigNumber.from(500)))
			.to.emit(marketplace, "MarketplaceFeeChanged")
			.withArgs(ethers.constants.AddressZero, ethers.BigNumber.from(500), ethers.BigNumber.from(500));
	})

})