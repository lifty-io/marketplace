# Marketplace

This project enables users to list thousands of NFTs by one signature request, secure sales, swap, and buy them. Each listing contains the offer part and the bid part with the amount of these items to execute.

## Deployments

<table>
<tr>
<th>Network</th>
<th>Marketplace address</th>
</tr>

<tr>
<td>Ethereum</td>
<td>

[0x5231617982e340a6651bd6357f15bc3461519b2b](https://etherscan.io/address/0x5231617982e340a6651bd6357f15bc3461519b2b#code)

</td>
</tr>

<tr>
<td>Polygon</td>
<td>

[0x1b813148B87263336f105E5460A7f84673525923](https://polygonscan.com/address/0x1b813148B87263336f105E5460A7f84673525923#code)

</td>
</tr>

<tr>
<td>BNB chain</td>
<td>

[0x393E0B30aeB1a9501bAc6F98F62e1E2B08899d29](https://bscscan.com/address/0x393E0B30aeB1a9501bAc6F98F62e1E2B08899d29#code)

</td>
</tr>

<tr>
<td>OKX chain</td>
<td>

[0x85adb6ff481d1fecfc9063e773170cf8699a5a3b](https://www.oklink.com/en/okc/address/0x85adb6ff481d1fecfc9063e773170cf8699a5a3b)

</td>
</tr>

<tr>
<td>Avalanche</td>
<td>

[0x92C0D0826b2108FE7C51b42a22C7912A4515d293](https://snowtrace.io/address/0x92C0D0826b2108FE7C51b42a22C7912A4515d293#code)

</td>
</tr>

<tr>
<td>Arbitrum</td>
<td>

[0x92C0D0826b2108FE7C51b42a22C7912A4515d293](https://arbiscan.io/address/0x92c0d0826b2108fe7c51b42a22c7912a4515d293#code)

</td>
</tr>

</table>

## Install

To install dependencies and compile contracts:

```bash
git clone https://github.com/Liquidifty/marketplace && cd marketplace
yarn install
yarn build
```

## Usage

To run hardhat tests written in javascript:

```bash
yarn test
```

## Listing for sale

For a listing of an NFT token for ERС20 or Native (ETH) token, you will need to follow these steps:

1. Set approval on an NFT contract to the marketplace contract for operations with your token.
2. Create a Position:
   1. Create an Asset with all the data of your NFT token and place it in the bid part of your Position.
   2. Create an Asset with ERC20 (or Native) token and place it in the ask part of your Position.
   3. Specify totalAmount of Positions that you would like to sell.
   4. Add creationTime and expirationTime for this Position.
3. Create an Order:
   1. Hash Position with keccak256.
   2. Sign this hash with your wallet, and this will be your rootSign.
   3. For this simple listing order, our proof will be an empty array.
   4. Specify askAny and bidAny if you want to create an order for multiple tokens from a collection (note: your bid or ask Assets token id must be null in this case).

Your Position is ready, and you can submit it to our API – then it will appear on the marketplace.

## Buying

To purchase a Position, you need to specify them to create the Deal.

Note: you need to approve all the tokens specified in the ask section of these positions.

To keep listings fast and reliable, our backend will create a signature for all roots of orders and the Deal's expiration date. You will need to call the buy method of the contract with this Deal object.

Notice: the backend or any other third party cannot change any parts of the listing. In this case, it will lead to dramatic changes in the position hash, that was signed by the user with his wallet.

## Diagram

![Marketplace](diagrams/Marketplace.drawio.svg)
