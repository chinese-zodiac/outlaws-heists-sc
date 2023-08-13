const hre = require("hardhat");
const loadJsonFile = require("load-json-file");
const { LocationController, EntityStoreERC20, EntityStoreERC721, Bandits, Outlaws } = require("../deployconfig.json");

const { ethers } = hre;
const { parseEther } = ethers.utils;


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    const Gangs = await ethers.getContractFactory("Gangs");
    const gangs = await Gangs.deploy(LocationController);
    await gangs.deployed();
    console.log("Gangs deployed to:", gangs.address);


    const LocTownSquare = await ethers.getContractFactory("LocTownSquare");
    const townSquare = await LocTownSquare.deploy(
        LocationController,//ILocationController _locationController,
        gangs.address,//Gangs _gang,
        Bandits,//IERC20 _bandits,
        Outlaws,//IERC721 _outlaws,
        EntityStoreERC20,//EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721,//EntityStoreERC721 _entityStoreERC721
    );
    await townSquare.deployed();
    console.log("LocTownSquare deployed to:", townSquare.address);


    console.log("waiting 5 seconds");
    await delay(5000);
    await gangs.grantRole(ethers.utils.id("MINTER_ROLE"), townSquare.address);
    console.log("MINTER_ROLE granted to TownSquare");

    console.log("waiting 5 seconds");
    await delay(5000);
    await gangs.setMaxOptions(432, 432, 336);
    console.log("setMaxOptions set for gang names");

    console.log("waiting 5 seconds");
    await delay(5000);
    await townSquare.setValidEntities([gangs.address], true);
    console.log("setValidEntities set to TRUE for gangs address");

    console.log("waiting 5 seconds");
    await delay(5000);
    await townSquare.setValidRoute([ethers.constants.AddressZero], true);
    console.log("setValidRoute set to TRUE for zero address");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
