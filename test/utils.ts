
import { MerkleTree } from "merkletreejs"
import { Asset, AssetType, MatchedOrder, OrderType } from "./models";
import keccak256 from "keccak256"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Signer } from "crypto";

export async function populateMatchedOrdersWithProofsAndRootSignature(orders: MatchedOrder[], hashes: string[], rootSigner: SignerWithAddress): Promise<MatchedOrder[]> {
	let tree = new MerkleTree(hashes, keccak256, {
		sort: true
	});

	const root = tree.getHexRoot();
	const rootSign = await rootSigner.signMessage(ethers.utils.arrayify(root));

	let k = 0;
	orders.forEach((x) => {
		x.root = root;
		x.rootSign = rootSign;
		x.proof = getProof(tree, hashes[k]);
		k++;
	})

	return orders;
}

export async function createBackendSignature(txExpirationDate: number, marketplaceAddress: string, chainId: number, hashes: string[], backendSigner: SignerWithAddress): Promise<string> {
	const message = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
		[
			"uint256",
			"address",
			"uint256",
			"bytes32[]",
		],
		[
			txExpirationDate, marketplaceAddress, chainId, hashes
		]
	));

	return await backendSigner.signMessage(
		ethers.utils.arrayify(message)
	);
}

export function createdMockedMatchOrder(ask: Asset[], bid: Asset[], ot: OrderType, signer: SignerWithAddress, askAny: boolean, bidAny: boolean): MatchedOrder {
	const totalAmount = 1;
	const amount = 1;
	const creationDate = new Date().getTime();
	const expirationDate = new Date().getTime();

	return new MatchedOrder(
		bid,
		ask,
		totalAmount,
		amount,
		signer.address,
		creationDate,
		expirationDate,
		askAny,
		bidAny,
		ot
	);
}

export function getProof(mt: MerkleTree, hash: string): string[] {
	const proof = mt.getProof(hash);

	let proofArray: string[] = [];

	for (let i = 0; i < proof.length; i++) {
		proofArray.push(`0x${proof[i].data.toString("hex")}`);
	}
	return proofArray;
}

export async function clearBalance(...wallets: SignerWithAddress[]) {

	for (let i = 0; i < wallets.length; i++) {
		let w = wallets[i];

		const balance = await w.getBalance();
		if (balance.gt(0)) {
			let tx = await w.sendTransaction({
				to: ethers.constants.AddressZero,
				value: balance.sub(ethers.utils.parseEther("0.1"))
			})
			await tx.wait();
		}
	}
}