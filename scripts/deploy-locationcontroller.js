const hre = require("hardhat");
const loadJsonFile = require("load-json-file");

const { ethers } = hre;
const { parseEther } = ethers.utils;

async function main() {

    const LocationController = await ethers.getContractFactory("LocationController");
    const locationController = await LocationController.deploy();
    await locationController.deployed();
    console.log("LocationController deployed to:", locationController.address);

    const EntityStoreERC20 = await ethers.getContractFactory("EntityStoreERC20");
    const entityStoreERC20 = await EntityStoreERC20.deploy(locationController.address);
    await entityStoreERC20.deployed();
    console.log("EntityStoreERC20 deployed to:", entityStoreERC20.address);

    const EntityStoreERC721 = await ethers.getContractFactory("EntityStoreERC721");
    const entityStoreERC721 = await EntityStoreERC721.deploy(locationController.address);
    await entityStoreERC721.deployed();
    console.log("EntityStoreERC721 deployed to:", entityStoreERC721.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
