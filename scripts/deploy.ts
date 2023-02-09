// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre, { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const BACKEND_SIGNER_ADDRESS = process.env.BACKEND_SIGNER_ADDRESS
    ? process.env.BACKEND_SIGNER_ADDRESS
    : "";

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(BACKEND_SIGNER_ADDRESS);
  await marketplace.deployed();

  console.log("Marketplace deployed to:", marketplace.address);
  await hre.run("verify:verify", {
    address: marketplace.address,
    contract: "contracts/Marketplace.sol:Marketplace",
    constructorArguments: [BACKEND_SIGNER_ADDRESS],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
