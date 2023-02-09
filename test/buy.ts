import { ethers } from "hardhat";
import { Asset, AssetType, MatchedOrder, OrderType } from "./models";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Marketplace, TestCollectionERC1155, TestCollectionERC721, TestTokenERC20 } from "../typechain";
import { expect } from "chai";
import { createBackendSignature, createdMockedMatchOrder, populateMatchedOrdersWithProofsAndRootSignature, clearBalance } from "./utils";

describe("Buy", function () {
	let chainId: number;
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
	let maxTokenIdOfERC721AndERC1155;
	let ERC20Amount: number;
	let ERC1155Amount: number;
	let tx;


	beforeEach(async function () {
		const signers = await ethers.getSigners();
		chainId = 31337;

		marketplaceBeneficiary = signers[0];
		signer = signers[1];
		interactor = signers[2];
		backendSigner = signers[3];
		creator = signers[4];

		const Marketplace = await ethers.getContractFactory("Marketplace");
		marketplace = await Marketplace.connect(backendSigner).deploy(backendSigner.address);
		await marketplace.deployed();

		await marketplace.connect(backendSigner).changeFeesBeneficiary(marketplaceBeneficiary.address);
		await marketplace.changeMarketplaceCollectionFee("0x0000000000000000000000000000000000000000", 250, 250);

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
		await testCollectionAskERC1155.deployed();

		testCollectionBidERC1155 = await TestCollectionERC1155.deploy(testTokenName, testTokenSymbol, contractURI);
		await testCollectionBidERC1155.deployed();

		testTokenSecond = await TestToken.connect(backendSigner).deploy(testTokenName, testTokenSymbol);
		await testTokenSecond.deployed();

		maxTokenIdOfERC721AndERC1155 = 4;
		ERC20Amount = 10000;
		ERC1155Amount = 10;
		for (let i = 0; i < maxTokenIdOfERC721AndERC1155; i++) {
			tx = await testCollectionBid.connect(signer).mint();
			await tx.wait();

			tx = await testCollectionBid.connect(signer).setApprovalForAll(marketplace.address, true);
			await tx.wait();

			tx = await testCollectionAsk.connect(interactor).mint();
			await tx.wait();

			tx = await testCollectionAsk.connect(interactor).setApprovalForAll(marketplace.address, true);
			await tx.wait();

			tx = await testCollectionBidERC1155.connect(signer).mint(ERC1155Amount);
			await tx.wait();

			tx = await testCollectionBidERC1155.connect(signer).setApprovalForAll(marketplace.address, true);
			await tx.wait();

			tx = await testCollectionAskERC1155.connect(interactor).mint(ERC1155Amount);
			await tx.wait();

			tx = await testCollectionAskERC1155.connect(interactor).setApprovalForAll(marketplace.address, true);
			await tx.wait();

		}
		await testToken.connect(interactor).mint(ethers.BigNumber.from(ERC20Amount));
		await testToken.connect(interactor).approve(marketplace.address, ethers.BigNumber.from(ERC20Amount));

		await testTokenSecond.connect(interactor).mint(ethers.BigNumber.from(ERC20Amount));
		await testTokenSecond.connect(interactor).approve(marketplace.address, ethers.BigNumber.from(ERC20Amount));

		await testToken.connect(signer).mint(ethers.BigNumber.from(ERC20Amount));
		await testToken.connect(signer).approve(marketplace.address, ethers.BigNumber.from(ERC20Amount));

		await testTokenSecond.connect(signer).mint(ethers.BigNumber.from(ERC20Amount));
		await testTokenSecond.connect(signer).approve(marketplace.address, ethers.BigNumber.from(ERC20Amount));

	})

	it("Should mint several nfts and exchange them", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];

		for (let i = 0; i < leavesLen; i++) {
			const ask: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionAsk.address);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);

			const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.SWAP, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}
		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes);
		await tx.wait();

		let buyFilter = marketplace.filters.Buy();
		let buyEvents = await marketplace.queryFilter(buyFilter);

		let tokenId = 0

		for (let i = 0; i < buyEvents.length; i++) {
			expect(buyEvents[i].args[1]).equal(interactor.address)
			expect(buyEvents[i].args[2]).equal(signer.address)
			expect(buyEvents[i].args[3]).equal("1") //amount

			tokenId++;
		}

		expect(await testCollectionBid.balanceOf(interactor.address)).equal(4);
		expect(await testCollectionAsk.balanceOf(signer.address)).equal(4);
	});

	it("Should mint several nfts, exchange them, and be reverted because total amount is exceeded", async function () {
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];

		const ask: Asset = new Asset(0, ethers.BigNumber.from(2), AssetType.ERC1155, testCollectionAskERC1155.address);
		const bid: Asset = new Asset(0, ethers.BigNumber.from(2), AssetType.ERC1155, testCollectionBidERC1155.address);

		const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.SWAP, signer, false, false);
		matchedOrder.totalAmount = 2;

		matchedOrderLeaves.push(matchedOrder);
		hashes.push(matchedOrder.hash());

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes);
		await tx.wait();

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes);
		await tx.wait();

		await expect(marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes))
			.to.be.revertedWith("ProceedOrder: wrong amount")
	});

	it("ERC1155 trade with amount > 1 should take correct amount of payment", async function () {
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];
		const priceForNFT = 1000;

		const initialSignerNFTBalance = await testCollectionBidERC1155.balanceOf(interactor.address, 0);
		const initialInteractorTokenBalance = await testToken.balanceOf(interactor.address);

		const ask: Asset = new Asset(0, priceForNFT, AssetType.ERC20, testToken.address);
		const bid: Asset = new Asset(0, ethers.BigNumber.from(1), AssetType.ERC1155, testCollectionBidERC1155.address);

		const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.SWAP, signer, false, false);
		matchedOrder.amount = 2;
		matchedOrder.totalAmount = 6;

		matchedOrderLeaves.push(matchedOrder);
		hashes.push(matchedOrder.hash());

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		for (let i = 0; i < 3; i++) {
			tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes);
			await tx.wait();
		}

		expect((await testCollectionBidERC1155.balanceOf(interactor.address, 0)).sub(initialSignerNFTBalance)).to.be.equal(6);
		expect(initialInteractorTokenBalance.sub(await testToken.balanceOf(interactor.address))).to.be.equal(6000);

	});

	it("Should mint several nfts and exchange them for eth", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];
		let priceForNFT = 3;

		const expectedMarketplaceBenificiaryBalance = "0.6"
		const expectedCreator = "0.3"
		const expectedSignerBalance = "11.1"  //12 - 0.3 - 0.6

		await clearBalance(signer, marketplaceBeneficiary, creator);

		let creatorBalanceBefore = await creator.getBalance();
		let marketplaceBeneficiaryBalanceBefore = await marketplaceBeneficiary.getBalance();

		expect(creatorBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;
		expect(marketplaceBeneficiaryBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;

		for (let i = 0; i < leavesLen; i++) {
			tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(250)]);
			await tx.wait();

			const ask: Asset = new Asset(0, ethers.utils.parseEther(priceForNFT.toString()), AssetType.Native, ethers.constants.AddressZero);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);

			const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}

		let signerBalanceBefore = await signer.getBalance();
		expect(signerBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes, {
			value: ethers.utils.parseEther(((priceForNFT) * leavesLen + 1).toString()) // +1 to cover the fees and royalties
		});
		await tx.wait();

		let buyFilter = marketplace.filters.Buy();
		let buyEvents = await marketplace.queryFilter(buyFilter);

		let tokenId = 0
		buyEvents.forEach(x => {
			expect(x.args[1]).equal(interactor.address)
			expect(x.args[2]).equal(signer.address)
			expect(x.args[3]).equal("1")
			tokenId++;
		})

		expect(ethers.utils.formatEther((await creator.getBalance()).
			sub(creatorBalanceBefore).toString()
		)).equal(expectedCreator);

		expect(ethers.utils.formatEther((await marketplaceBeneficiary.getBalance()).
			sub(marketplaceBeneficiaryBalanceBefore).toString()
		)).equal(expectedMarketplaceBenificiaryBalance);

		expect(ethers.utils.formatEther((await signer.getBalance()).
			sub(signerBalanceBefore).toString()
		)).equal(expectedSignerBalance);

		for (let i = 0; i < leavesLen; i++) {
			expect(await testCollectionBid.ownerOf(i))
				.equal(interactor.address);
		}
	});

	it("Should mint several nfts and exchange them for currency", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];
		let priceForNFTInCurrency = 1000;

		let marketplaceBeneficiaryExpectedBalance = 200;
		let creatorExpectedBalance = 100
		let signerExpectedBalance = (4000 + ERC20Amount) - marketplaceBeneficiaryExpectedBalance - creatorExpectedBalance;

		for (let i = 0; i < leavesLen; i++) {
			tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(250)]);
			await tx.wait();

			const ask: Asset = new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testToken.address);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);



			const matchedOrder: MatchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes, {});
		await tx.wait();

		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toNumber()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toNumber()).
			equal(creatorExpectedBalance);

		expect((await testToken.balanceOf(signer.address)).toNumber()).
			equals(signerExpectedBalance);

		for (let i = 0; i < leavesLen; i++) {
			expect(await testCollectionBid.ownerOf(i))
				.equal(interactor.address);
		}
	});

	it("Should mint several nfts and exchange them for currency and one for native", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];
		let priceForNFTInCurrency = 1000;
		let priceForNFTInNative = 3;

		let marketplaceBeneficiaryExpectedBalance = "150";
		let creatorExpectedBalance = "75"
		let signerExpectedBalance = (3000 + ERC20Amount - 225).toString();

		const expectedMarketplaceBenificiaryBalance = "0.15"
		const expectedCreator = "0.075"
		const expectedSignerBalance = "2.775" //3 - 0.15 - 0.075

		await clearBalance(signer, marketplaceBeneficiary, creator);

		let creatorBalanceBefore = await creator.getBalance();
		let marketplaceBeneficiaryBalanceBefore = await marketplaceBeneficiary.getBalance();

		expect(creatorBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;
		expect(marketplaceBeneficiaryBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;

		for (let i = 0; i < leavesLen; i++) {
			tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(250)]);
			await tx.wait();

			const ask: Asset = new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testToken.address);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);

			const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}

		let signerBalanceBefore = await signer.getBalance();
		expect(signerBalanceBefore.lt(ethers.utils.parseEther("1"))).to.be.true;

		const askNative: Asset = new Asset(0, ethers.utils.parseEther(priceForNFTInNative.toString()), AssetType.Native, ethers.constants.AddressZero);
		matchedOrderLeaves[leavesLen - 1].ask = [askNative];
		matchedOrderLeaves[leavesLen - 1].orderType = OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE;
		hashes[leavesLen - 1] = matchedOrderLeaves[leavesLen - 1].hash();

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes, {
			value: ethers.utils.parseEther((priceForNFTInNative + 1).toString()).toString() // +1 to cover the fees and royalties
		});
		await tx.wait();

		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testToken.balanceOf(signer.address)).toString()).
			equals(signerExpectedBalance);

		expect(ethers.utils.formatEther((await creator.getBalance()).
			sub(creatorBalanceBefore).toString()
		)).equal(expectedCreator);

		expect(ethers.utils.formatEther((await marketplaceBeneficiary.getBalance()).
			sub(marketplaceBeneficiaryBalanceBefore).toString()
		)).equal(expectedMarketplaceBenificiaryBalance);

		expect(ethers.utils.formatEther((await signer.getBalance()).
			sub(signerBalanceBefore).toString()
		)).equal(expectedSignerBalance);


		for (let i = 0; i < leavesLen; i++) {
			expect(await testCollectionBid.ownerOf(i))
				.equal(interactor.address);
		}
	});

	it("Should mint several nfts and exchange them for several currencies", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let matchedOrderLeaves: MatchedOrder[] = [];
		let priceForNFTInCurrency = 1000;

		let marketplaceBeneficiaryExpectedBalance = "100";
		let creatorExpectedBalance = "50"
		let signerExpectedBalance = (2000 + ERC20Amount - 100 - 50).toString();

		for (let i = 0; i < leavesLen; i++) {
			tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(250)]);
			await tx.wait();

			const ask: Asset = new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testToken.address);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);

			const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}

		matchedOrderLeaves[0].ask = [new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testTokenSecond.address)];
		matchedOrderLeaves[1].ask = [new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testTokenSecond.address)];

		hashes[0] = matchedOrderLeaves[0].hash();
		hashes[1] = matchedOrderLeaves[1].hash();

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes, {});
		await tx.wait();

		// first token balance check
		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testToken.balanceOf(signer.address)).toString()).
			equals(signerExpectedBalance);

		// second token balance check
		expect((await testTokenSecond.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testTokenSecond.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testTokenSecond.balanceOf(signer.address)).toString()).
			equals(signerExpectedBalance);

		for (let i = 0; i < leavesLen; i++) {
			expect(await testCollectionBid.ownerOf(i))
				.equal(interactor.address);
		}
	});

	it("Should do SWAP with ERC1155, ERC721 and ERC20 tokens", async function () {
		let leavesLen = 4;
		let hashes: string[] = [];
		let priceForNFTInCurrency = 1000;
		let matchedOrderLeaves: MatchedOrder[] = [];
		let marketplaceBeneficiaryExpectedBalance = 100;
		let creatorExpectedBalance = 50
		let signerExpectedBalance = (2000 + ERC20Amount) - marketplaceBeneficiaryExpectedBalance - creatorExpectedBalance;

		for (let i = 0; i < leavesLen; i++) {
			tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(250)]);
			await tx.wait();

			const ask: Asset = new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testToken.address);
			const bid: Asset = new Asset(i, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address);

			const matchedOrder = createdMockedMatchOrder([ask], [bid], OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
			matchedOrderLeaves.push(matchedOrder);
			hashes.push(matchedOrder.hash());
		}

		matchedOrderLeaves[0].ask = [new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testTokenSecond.address)];
		matchedOrderLeaves[1].ask = [new Asset(0, ethers.BigNumber.from(priceForNFTInCurrency), AssetType.ERC20, testTokenSecond.address)];

		hashes[0] = matchedOrderLeaves[0].hash();
		hashes[1] = matchedOrderLeaves[1].hash();

		matchedOrderLeaves = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaves, hashes, signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, hashes, backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaves, txExpirationDate, backendSignature, hashes, {});
		await tx.wait();

		// first token balance check
		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toNumber()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toNumber()).
			equal(creatorExpectedBalance);

		expect((await testToken.balanceOf(signer.address)).toNumber()).
			equals(signerExpectedBalance);

		// second token balance check
		expect((await testTokenSecond.balanceOf(marketplaceBeneficiary.address)).toNumber()).
			equal(marketplaceBeneficiaryExpectedBalance);

		expect((await testTokenSecond.balanceOf(creator.address)).toNumber()).
			equal(creatorExpectedBalance);

		expect((await testTokenSecond.balanceOf(signer.address)).toNumber()).
			equals(signerExpectedBalance);

		for (let i = 0; i < leavesLen; i++) {
			expect(await testCollectionBid.ownerOf(i))
				.equal(interactor.address);
		}
	});

	it("Should do SWAP with ERC1155, ERC721 and ERC20 tokens", async function () {
		let askAmountOfERC20 = 100;
		let bidAmountOfERC1155 = 5;
		let bidAmountOfERC721 = 1;

		let interactorBalanceAfterBuy = "9900";
		let creatorExpectedBalance = "0"
		let expectedTestERC20BalanceOfSigner = (askAmountOfERC20 + ERC20Amount).toString()
		let expectedTestERC721InteractorBalance = bidAmountOfERC721.toString()
		let expectedTestERC1155InteractorBalance = bidAmountOfERC1155.toString()

		const bid: Asset[] = [
			new Asset(0, ethers.BigNumber.from(bidAmountOfERC721), AssetType.ERC721, testCollectionBid.address),
			new Asset(0, ethers.BigNumber.from(bidAmountOfERC1155), AssetType.ERC1155, testCollectionBidERC1155.address),
		];

		const ask: Asset[] = [
			new Asset(0, ethers.BigNumber.from(askAmountOfERC20), AssetType.ERC20, testToken.address),
		];

		let matchedOrderLeaf: MatchedOrder[] = [createdMockedMatchOrder(ask, bid, OrderType.SWAP, signer, false, false)]
		matchedOrderLeaf = await populateMatchedOrdersWithProofsAndRootSignature(matchedOrderLeaf, [matchedOrderLeaf[0].hash()], signer);

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [matchedOrderLeaf[0].hash()], backendSigner);

		tx = await marketplace.connect(interactor).buy(matchedOrderLeaf, txExpirationDate, backendSignature, [matchedOrderLeaf[0].hash()], {});
		await tx.wait();

		expect((await testToken.balanceOf(interactor.address)).toString()).
			equal(interactorBalanceAfterBuy);

		expect((await testTokenSecond.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testCollectionBid.balanceOf(interactor.address)).toString()).
			equal(expectedTestERC721InteractorBalance);

		expect((await testCollectionBidERC1155.balanceOf(interactor.address, 0)).toString()).
			equal(expectedTestERC1155InteractorBalance);

		expect((await testCollectionBidERC1155.balanceOf(signer.address, 0)).toString()).
			equal((ERC1155Amount - parseInt(expectedTestERC1155InteractorBalance)).toString());

		expect((await testToken.balanceOf(signer.address)).toString()).
			equal(expectedTestERC20BalanceOfSigner);

	});

	it("Should make OFFER_TO_MULTI_CURRENCY with ERC721 and two ERC20 tokens", async function () {
		let bidAmountOfERC20 = 100;
		let priceForERC721Token = 100;

		let marketplaceBeneficiaryBalanceExpected = "4";
		let creatorExpectedBalance = "2";
		let signerExpectedBalance = "9900";
		let interactorBalanceExpected = (ERC20Amount + priceForERC721Token - 4 - 2).toString();

		const tokenIdBid = 0;

		tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionAsk.address, [creator.address], [ethers.BigNumber.from(250)])
		await tx.wait();

		const ask: Asset[] = [
			new Asset(tokenIdBid, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionAsk.address),
		];

		const bid: Asset[] = [
			new Asset(0, ethers.BigNumber.from(bidAmountOfERC20), AssetType.ERC20, testToken.address),
			new Asset(0, ethers.BigNumber.from(bidAmountOfERC20), AssetType.ERC20, testTokenSecond.address),
		];

		let matchedOrderLeaf = createdMockedMatchOrder(ask, bid, OrderType.OFFER_TO_CURRENCY_OR_MULTIPLE_CURRENCY, signer, false, false);
		matchedOrderLeaf = (await populateMatchedOrdersWithProofsAndRootSignature([matchedOrderLeaf], [matchedOrderLeaf.hash()], signer))[0];

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [matchedOrderLeaf.hash()], backendSigner);

		tx = await marketplace.connect(interactor).buy([matchedOrderLeaf], txExpirationDate, backendSignature, [matchedOrderLeaf.hash()], {});
		await tx.wait();

		expect((await testToken.balanceOf(interactor.address)).toString()).
			equal(interactorBalanceExpected);

		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryBalanceExpected);

		expect((await testToken.balanceOf(signer.address)).toString()).
			equal(signerExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testCollectionAsk.ownerOf(tokenIdBid)).toString()).
			equal(signer.address);

		expect((await testTokenSecond.balanceOf(interactor.address)).toString()).
			equal(interactorBalanceExpected);

		expect((await testTokenSecond.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryBalanceExpected);

		expect((await testTokenSecond.balanceOf(signer.address)).toString()).
			equal(signerExpectedBalance);

		expect((await testTokenSecond.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);
	});

	it("Should make OFFER_TO_CURRENCY with ERC721 token", async function () {
		let bidAmountOfERC20 = 100;
		let priceForERC721Token = 100;

		let marketplaceBeneficiaryBalanceExpected = "4";
		let creatorExpectedBalance = "2";
		let signerExpectedBalance = "9900";
		let interactorBalanceExpected = (ERC20Amount + priceForERC721Token - 4 - 2).toString();

		const tokenIdBid = 0;

		tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionAsk.address, [creator.address], [ethers.BigNumber.from(250)])
		await tx.wait();

		const ask: Asset[] = [
			new Asset(tokenIdBid, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionAsk.address),
		];

		const bid: Asset[] = [
			new Asset(0, ethers.BigNumber.from(bidAmountOfERC20), AssetType.ERC20, testToken.address),
		];

		let matchedOrderLeaf = createdMockedMatchOrder(ask, bid, OrderType.OFFER_TO_CURRENCY_OR_MULTIPLE_CURRENCY, signer, false, false);
		matchedOrderLeaf = (await populateMatchedOrdersWithProofsAndRootSignature([matchedOrderLeaf], [matchedOrderLeaf.hash()], signer))[0];

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [matchedOrderLeaf.hash()], backendSigner);

		tx = await marketplace.connect(interactor).buy([matchedOrderLeaf], txExpirationDate, backendSignature, [matchedOrderLeaf.hash()], {});
		await tx.wait();

		let buyFilter = marketplace.filters.Buy();
		let buyEvents = await marketplace.queryFilter(buyFilter);

		let tokenId = 0
		buyEvents.forEach(x => {
			expect(x.args[1]).equal(interactor.address)
			expect(x.args[2]).equal(signer.address)
			expect(x.args[3]).equal("1")
			tokenId++;
		})

		expect((await testToken.balanceOf(interactor.address)).toString()).
			equal(interactorBalanceExpected);

		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryBalanceExpected);

		expect((await testToken.balanceOf(signer.address)).toString()).
			equal(signerExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testCollectionAsk.ownerOf(tokenIdBid)).toString()).
			equal(signer.address);
	});

	it("Should make BUNDLE_TO_CURRENCY ", async function () {
		let askAmountOfERC20 = 100;

		let marketplaceBeneficiaryBalanceExpected = "50";
		let creatorExpectedBalance = "0"; //royalties are not paid in bundle sell
		let signerExpectedBalance = "10050"; 
		let interactorBalanceExpected = "9900";

		tx = await marketplace.connect(backendSigner).changeCollectionRoyalties(testCollectionBid.address, [creator.address], [ethers.BigNumber.from(2500)])
		await tx.wait();

		tx = await marketplace.connect(backendSigner).changeMarketplaceCollectionFee(ethers.constants.AddressZero, ethers.BigNumber.from(2500), ethers.BigNumber.from(2500))
		await tx.wait();

		const ask: Asset[] = [
			new Asset(0, ethers.BigNumber.from(askAmountOfERC20), AssetType.ERC20, testToken.address),
		];

		const bid: Asset[] = [
			new Asset(0, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address),
			new Asset(1, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address),
			new Asset(2, ethers.BigNumber.from(1), AssetType.ERC721, testCollectionBid.address),
		];

		let matchedOrderLeaf = createdMockedMatchOrder(ask, bid, OrderType.BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE, signer, false, false);
		matchedOrderLeaf = (await populateMatchedOrdersWithProofsAndRootSignature([matchedOrderLeaf], [matchedOrderLeaf.hash()], signer))[0];

		const txExpirationDate = new Date().valueOf() + 10000;
		const backendSignature = await createBackendSignature(txExpirationDate, marketplace.address, chainId, [matchedOrderLeaf.hash()], backendSigner);

		tx = await marketplace.connect(interactor).buy([matchedOrderLeaf], txExpirationDate, backendSignature, [matchedOrderLeaf.hash()], {});
		await tx.wait();

		let buyFilter = marketplace.filters.Buy();
		let buyEvents = await marketplace.queryFilter(buyFilter);

		let tokenId = 0
		buyEvents.forEach(x => {
			expect(x.args[1]).equal(interactor.address)
			expect(x.args[2]).equal(signer.address)
			expect(x.args[3]).equal("1")
			tokenId++;
		})

		expect((await testToken.balanceOf(interactor.address)).toString()).
			equal(interactorBalanceExpected);

		expect((await testToken.balanceOf(marketplaceBeneficiary.address)).toString()).
			equal(marketplaceBeneficiaryBalanceExpected);

		expect((await testToken.balanceOf(signer.address)).toString()).
			equal(signerExpectedBalance);

		expect((await testToken.balanceOf(creator.address)).toString()).
			equal(creatorExpectedBalance);

		expect((await testCollectionBid.ownerOf(ethers.BigNumber.from(0))).toString()).
			equal(interactor.address);

		expect((await testCollectionBid.ownerOf(ethers.BigNumber.from(1))).toString()).
			equal(interactor.address);

		expect((await testCollectionBid.ownerOf(ethers.BigNumber.from(2))).toString()).
			equal(interactor.address);
	});
});