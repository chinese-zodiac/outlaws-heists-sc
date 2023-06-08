const hre = require("hardhat");
const loadJsonFile = require("load-json-file");

const { ethers } = hre;
const { parseEther, formatEther } = ethers.utils;

const ATMW_SALE = "";

async function main() {

  const atmwSale = await ethers.getContractAt("DggSale", ATMW_SALE);

  console.log("getting count...");
  const count = await atmwSale.totalDepositors();

  console.log("Got Count:", count);
  console.log();
  console.log();
  console.log();

  for (let i = 0; i < count; i++) {
    let depositor = await atmwSale.getDepositorFromIndex(i);
    let wad = await atmwSale.depositedAmount(depositor);
    console.log(depositor, formatEther(wad));
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
