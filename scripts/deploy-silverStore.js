const hre = require("hardhat");
const loadJsonFile = require("load-json-file");
const { zeroAddress, Gangs, USTSD, TownSquare, LocationController, EntityStoreERC20, EntityStoreERC721 } = require("../deployconfig.json");

const { ethers } = hre;
const { parseEther } = ethers.utils;


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {


    const TownSquareSc = await ethers.getContractAt("LocTownSquare", TownSquare);



    const LocSilverStore = await ethers.getContractFactory("LocSilverStore");
    const silverStore = await LocSilverStore.deploy(
        LocationController,//ILocationController _locationController,
        Gangs,//Gangs _gang,
        USTSD,//IERC721 _ustsd,
        EntityStoreERC20,//EntityStoreERC20 _entityStoreERC20,
        EntityStoreERC721//EntityStoreERC721 _entityStoreERC721
    );
    await silverStore.deployed();
    console.log("LocSilverStore deployed to:", silverStore.address);

    console.log("waiting 5 seconds");
    await delay(5000);
    await silverStore.setValidEntities([Gangs], true);
    console.log("setValidEntities set to TRUE for gangs address");

    console.log("waiting 5 seconds");
    await delay(5000);
    await silverStore.setValidRoute([TownSquareSc.address], true);
    console.log("SilverStore/TownSquare: setValidRoute set to TRUE for zero address");

    console.log("waiting 5 seconds");
    await delay(5000);
    await TownSquareSc.setValidRoute([silverStore.address], true);
    console.log("TownSquare/SilverStore: setValidRoute set to TRUE for zero address");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
