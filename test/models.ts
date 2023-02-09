import { ethers } from "ethers";

export class Asset {
	public id: number;
	public amount: ethers.BigNumberish;
	public assetType: AssetType;
	public collection: string;

	constructor(id: number, amount: ethers.BigNumberish, assetType: number, collection: string) {
		this.id = id;
		this.amount = amount;
		this.assetType = assetType;
		this.collection = collection;
	}
}

export class MatchedOrder {
	public bid: Asset[];
	public ask: Asset[];
	public totalAmount: number;
	public amount: number;
	public root: string = "";
	public rootSign: string = "";
	public signer: string;
	public creationDate: number;
	public expirationDate: number;
	public proof: string[] = [];
	public askAny: boolean;
	public bidAny: boolean;
	public orderType: OrderType;

	constructor(
		bid: Asset[],
		ask: Asset[],
		totalAmount: number,
		amount: number,
		signer: string,
		creationDate: number,
		expirationDate: number,
		askAny: boolean,
		bidAny: boolean,
		orderType: OrderType
	) {
		this.bid = bid;
		this.ask = ask;
		this.totalAmount = totalAmount;
		this.amount = amount;
		this.signer = signer;
		this.creationDate = creationDate;
		this.expirationDate = expirationDate;
		this.askAny = askAny;
		this.bidAny = bidAny;
		this.orderType = orderType;
	}

	public hash(): string {

		if (this.bidAny && this.bid.length === 1) {
			return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
				[
					"uint256",
					"address",
					"uint256",
					"tuple(uint256 assetType, address collection, int256 id, uint256 amount)[]",
					"uint256",
					"uint256",
					"uint256",
				],
				[
					this.bid[0].assetType,
					this.bid[0].collection,
					this.bid[0].amount,
					this.ask,
					this.totalAmount,
					this.creationDate,
					this.expirationDate,
				]
			));
		}

		if (this.askAny && this.ask.length === 1) {
			return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
				[
					"tuple(uint256 assetType, address collection, int256 id, uint256 amount)[]",
					"uint256",
					"address",
					"uint256",
					"uint256",
					"uint256",
					"uint256",
				],
				[
					this.bid,
					this.ask[0].assetType,
					this.ask[0].collection,
					this.ask[0].amount,
					this.totalAmount,
					this.creationDate,
					this.expirationDate,
				]
			));
		}



		return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
			[
				"tuple(uint256 assetType, address collection, int256 id, uint256 amount)[]",
				"tuple(uint256 assetType, address collection, int256 id, uint256 amount)[]",
				"uint256",
				"uint256",
				"uint256",
			],
			[
				this.bid,
				this.ask,
				this.totalAmount,
				this.creationDate,
				this.expirationDate,
			]
		));
	}
}

export enum AssetType {
	Native = 0,
	ERC20,
	ERC721,
	ERC1155
}

export enum OrderType {
	SWAP = 0,
	BUNDLE_OR_NFT_TO_CURRENCY_OR_NATIVE,
	OFFER_TO_CURRENCY_OR_MULTIPLE_CURRENCY
}
