const hre = require("hardhat");
const loadJsonFile = require("load-json-file");

const { ethers } = hre;
const { parseEther } = ethers.utils;

const { LocationController, EntityStoreERC20, EntityStoreERC721,
    Bandits, Outlaws, Gangs, TownSquare, CZUSD, RngHistory, SilverStore, USTSD, UstsdAdmin,
    pancakeswapRouter, pancakeswapFactory, BoostedValueCalculator, Roller,
    BoosterMul1x, BoosterAddBandits, BoosterMulUstsd10pct, BoosterMulOutlawSet,
    ResourceCounterfeitCurrency } = loadJsonFile.sync("./deployconfig.json");

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    const entityStoreErc20 = await ethers.getContractAt("EntityStoreERC20", EntityStoreERC20);
    const entityStoreErc721 = await ethers.getContractAt("EntityStoreERC721", EntityStoreERC721);
    const town = await ethers.getContractAt("LocTownSquare", TownSquare);
    const silverStore = await ethers.getContractAt("LocSilverStore", SilverStore);
    const boostedValueCalculator = await ethers.getContractAt("BoostedValueCalculator", BoostedValueCalculator);
    const roller = await ethers.getContractAt("Roller", Roller);
    const resourceCounterfeitCurrency = await ethers.getContractAt("TokenBase", ResourceCounterfeitCurrency);
    const boosterMul1x = await ethers.getContractAt("IBooster", BoosterMul1x);
    const boosterAddBandits = await ethers.getContractAt("IBooster", BoosterAddBandits);
    const boosterMulUstsd10pct = await ethers.getContractAt("IBooster", BoosterMulUstsd10pct);
    const boosterMulOutlawSet = await ethers.getContractAt("IBooster", BoosterMulOutlawSet);

    /*const TokenBase = await ethers.getContractFactory("TokenBase");
    const resourceCounterfeitCurrency = await TokenBase.deploy(
        "0x70e1cB759996a1527eD1801B169621C18a9f38F9",
        CZUSD, pancakeswapFactory, "Resource: CounterfeitCurrency", "R-COUNT");
    await resourceCounterfeitCurrency.deployed();
    console.log("resourceCounterfeitCurrency deployed to:", resourceCounterfeitCurrency.address);*/

    const LocTemplateResource = await ethers.getContractFactory("LocTemplateResource");
    const redRustlerRendevous = await LocTemplateResource.deploy(
        LocationController,
        EntityStoreERC20,
        Gangs,
        Bandits,
        RngHistory,
        boostedValueCalculator.address,
        resourceCounterfeitCurrency.address,
        roller.address,
        parseEther("25000")
    );
    await redRustlerRendevous.deployed();
    console.log("redRustlerRendevous deployed to:", redRustlerRendevous.address);

    console.log("waiting 5 seconds");
    await delay(5000);
    await resourceCounterfeitCurrency.grantRole(ethers.utils.id("MINTER_ROLE"), redRustlerRendevous.address);
    console.log("MINTER_ROLE granted to redRustlerRendevous for resourceCounterfeitCurrency");

    console.log("waiting 5 seconds");
    await delay(5000);
    await boostedValueCalculator.setBoostersAdd(
        ethers.utils.id("BOOSTER_GANG_PULL"),
        [boosterAddBandits.address],
        true
    );
    console.log("boostedValueCalculator: set boosterAddBandits");

    console.log("waiting 5 seconds");
    await delay(5000);
    await boostedValueCalculator.setBoostersMul(
        ethers.utils.id("BOOSTER_GANG_PULL"),
        [boosterMul1x.address, boosterMulOutlawSet.address, boosterMulUstsd10pct.address],
        true
    );
    console.log("boostedValueCalculator: set boosterMul1x,boosterMulOutlawSet,boosterMulUstsd10pct for BOOSTER_GANG_PULL");

    console.log("waiting 5 seconds");
    await delay(5000);
    await boostedValueCalculator.setBoostersMul(
        ethers.utils.id("BOOSTER_GANG_PROD_DAILY"),
        [boosterMul1x.address],
        true
    );
    console.log("boostedValueCalculator: set boosterMul1x for BOOSTER_GANG_PROD_DAILY");

    console.log("waiting 5 seconds");
    await delay(5000);
    await boostedValueCalculator.setBoostersAdd(
        ethers.utils.id("BOOSTER_GANG_POWER"),
        [boosterAddBandits.address],
        true
    );
    console.log("boostedValueCalculator: set boosterAddBandits for BOOSTER_GANG_POWER");

    console.log("waiting 5 seconds");
    await delay(5000);
    await boostedValueCalculator.setBoostersMul(
        ethers.utils.id("BOOSTER_GANG_POWER"),
        [boosterMul1x.address, boosterMulOutlawSet.address, boosterMulUstsd10pct.address],
        true
    );
    console.log("boostedValueCalculator: set boosterMul1x,boosterMulOutlawSet,boosterMulUstsd10pct for BOOSTER_GANG_POWER");

    console.log("waiting 5 seconds");
    await delay(5000);
    await redRustlerRendevous.setValidEntities([Gangs], true);
    console.log("set Gangs as valid entities for redRustlerRendevous");

    console.log("waiting 5 seconds");
    await delay(5000);
    await town.setValidRoute([redRustlerRendevous.address], true);
    console.log("set redRustlerRendevous as valid route for town");

    console.log("waiting 5 seconds");
    await delay(5000);
    await silverStore.setValidRoute([redRustlerRendevous.address], true);
    console.log("set redRustlerRendevous as valid route for silverStore");

    console.log("waiting 5 seconds");
    await delay(5000);
    await redRustlerRendevous.setFixedDestinations([TownSquare], true);
    console.log("set town as valid fixed destination for redRustlerRendevous");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
