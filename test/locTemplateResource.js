// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers, config } = require('hardhat');
const { time, expectRevert } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");
const loadJsonFile = require("load-json-file");
const { parse } = require('typechain');

const { LocationController, EntityStoreERC20, EntityStoreERC721,
    Bandits, Outlaws, Gangs, TownSquare, CZUSD, RngHistory, SilverStore, USTSD,
    pancakeswapRouter, pancakeswapFactory } = loadJsonFile.sync("./deployconfig.json");


const { expect } = chai;
const { parseEther, formatEther } = ethers.utils;


describe("LocTemplateResource", function () {
    let locationController, rngHistory, boostedValueCalculator, roller;
    let gangs, bandits, outlaws, czusd;
    let owner, player1, player2, player3;
    let entityStoreErc20, entityStoreErc721;
    let town;
    let czDeployer, czusdMinter;
    let outlawIds = [];
    let resourceLocations = [];
    let resourceTokens = [];
    let itemTokens = [];

    before(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        const czGnosisAddr = "0x745A676C5c472b50B50e18D4b59e9AeEEc597046"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [czGnosisAddr],
        })
        czusdMinter = await ethers.getSigner(czGnosisAddr);
        const czDeployerAddr = "0x70e1cB759996a1527eD1801B169621C18a9f38F9"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [czDeployerAddr],
        })
        czDeployer = await ethers.getSigner(czDeployerAddr);

        await owner.sendTransaction({
            to: czusdMinter.address,
            value: parseEther("1")
        });

        locationController = await ethers.getContractAt("LocationController", LocationController);
        czusd = await ethers.getContractAt("CZUsd", CZUSD);
        outlaws = await ethers.getContractAt("IOutlawsNft", Outlaws);
        gangs = await ethers.getContractAt("Gangs", Gangs);
        bandits = await ethers.getContractAt("TokenBase", Bandits);
        entityStoreErc20 = await ethers.getContractAt("EntityStoreERC20", EntityStoreERC20);
        entityStoreErc721 = await ethers.getContractAt("EntityStoreERC721", EntityStoreERC721);
        town = await ethers.getContractAt("LocTownSquare", TownSquare);

        const BoostedValueCalculator = await ethers.getContractFactory("BoostedValueCalculator");
        boostedValueCalculator = await BoostedValueCalculator.deploy();

        const BoosterConstant = await ethers.getContractFactory("BoosterConstant");
        const BoosterOutlawSet = await ethers.getContractFactory("BoosterOutlawSet");
        const BoosterIERC20Bal = await ethers.getContractFactory("BoosterIERC20Bal");
        const BoosterIERC721Bal = await ethers.getContractFactory("BoosterIERC721Bal");

        const RngHistoryMock = await ethers.getContractFactory("RngHistoryMock");
        rngHistory = await RngHistoryMock.deploy();

        const Roller = await ethers.getContractFactory("Roller");
        roller = await Roller.deploy();

        const TokenBase = await ethers.getContractFactory("TokenBase");
        resourceTokens[0] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Res-Tok-0", "RT0");
        resourceTokens[1] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Res-Tok-1", "RT1");
        resourceTokens[2] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Res-Tok-2", "RT2");
        itemTokens[0] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Itm-Tok-0", "IT0");
        itemTokens[1] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Itm-Tok-1", "IT1");
        itemTokens[2] = await TokenBase.deploy(czDeployerAddr, CZUSD, pancakeswapFactory, "Itm-Tok-2", "IT2");

        const boosterMul1x = await BoosterConstant.deploy(10000);
        const boosterAddBandits = await BoosterIERC20Bal.deploy(bandits.address, entityStoreErc20.address, 10000);
        const boosterMulUstsd10pct = await BoosterIERC721Bal.deploy(USTSD, entityStoreErc721.address, 1000);
        const boosterMulOutlawSet = await BoosterOutlawSet.deploy(outlaws.address, entityStoreErc721.address);

        const LocTemplateResource = await ethers.getContractFactory("LocTemplateResource");
        resourceLocations[0] = await LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[0].address,
            roller.address,
            parseEther("1")
        );
        resourceLocations[1] = await LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[1].address,
            roller.address,
            parseEther("8")
        );
        resourceLocations[2] = await LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[2].address,
            roller.address,
            parseEther("2500")
        );
        await outlaws.connect(czDeployer).grantRole(ethers.utils.id("MANAGER_ROLE"), czDeployer.address);

        await boostedValueCalculator.setBoostersAdd(
            ethers.utils.id("BOOSTER_GANG_PULL"),
            [boosterAddBandits.address],
            true
        );
        await boostedValueCalculator.setBoostersMul(
            ethers.utils.id("BOOSTER_GANG_PULL"),
            [boosterMul1x.address, boosterMulOutlawSet.address, boosterMulUstsd10pct.address],
            true
        );

        await boostedValueCalculator.setBoostersMul(
            ethers.utils.id("BOOSTER_GANG_PROD_DAILY"),
            [boosterMul1x.address],
            true
        );

        await boostedValueCalculator.setBoostersAdd(
            ethers.utils.id("BOOSTER_GANG_POWER"),
            [boosterAddBandits.address],
            true
        );
        await boostedValueCalculator.setBoostersMul(
            ethers.utils.id("BOOSTER_GANG_POWER"),
            [boosterMul1x.address, boosterMulOutlawSet.address, boosterMulUstsd10pct.address],
            true
        );


        await resourceLocations[0].setValidEntities([gangs.address], true);
        await resourceLocations[1].setValidEntities([gangs.address], true);
        await resourceLocations[2].setValidEntities([gangs.address], true);

        await town.connect(czDeployer).setValidRoute([resourceLocations[0].address], true);

        const outlawsSupply = toNum(await outlaws.totalSupply());

        await outlaws.connect(czDeployer).mint(player1.address);
        await outlaws.connect(czDeployer).set(outlawsSupply, 0, 0, "");
        await outlaws.connect(player1).setApprovalForAll(town.address, true);
        await town.connect(player1).spawnGangWithOutlaws([outlawsSupply]);


        await outlaws.connect(czDeployer).mint(player2.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 1, 1, 0, "");
        await outlaws.connect(czDeployer).mint(player2.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 2, 1, 0, "");
        await outlaws.connect(player2).setApprovalForAll(town.address, true);
        await town.connect(player2).spawnGangWithOutlaws([outlawsSupply + 1, outlawsSupply + 2]);

        await outlaws.connect(czDeployer).mint(player3.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 3, 0, 0, "");
        await outlaws.connect(czDeployer).mint(player3.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 4, 1, 0, "");
        await outlaws.connect(czDeployer).mint(player3.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 5, 2, 0, "");
        await outlaws.connect(czDeployer).mint(player3.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 6, 3, 0, "");
        await outlaws.connect(czDeployer).mint(player3.address);
        await outlaws.connect(czDeployer).set(outlawsSupply + 7, 4, 0, "");
        await outlaws.connect(player3).setApprovalForAll(town.address, true);
        await town.connect(player3).spawnGangWithOutlaws([outlawsSupply + 3, outlawsSupply + 4, outlawsSupply + 5, outlawsSupply + 6, outlawsSupply + 7]);
    });
    it("Should allow setBaseResourcesPerDay by manager", async function () {
        await resourceLocations[0].setBaseResourcesPerDay(parseEther("2"));
        const baseResourcesPerDay1 = await resourceLocations[0].baseProdDaily();
        const currentProdDaily1 = await resourceLocations[0].currentProdDaily();
        await resourceLocations[0].setBaseResourcesPerDay(parseEther("1"));
        const baseResourcesPerDay2 = await resourceLocations[0].baseProdDaily();
        const currentProdDaily2 = await resourceLocations[0].currentProdDaily();
        await expect(resourceLocations[0].connect(player1).setBaseResourcesPerDay(parseEther("2"))).to.be.reverted;
        expect(baseResourcesPerDay1).to.eq(parseEther("2"));
        expect(baseResourcesPerDay2).to.eq(parseEther("1"));
        expect(currentProdDaily1).to.eq(parseEther("2"));
        expect(currentProdDaily2).to.eq(parseEther("1"));
    });
    it("Should set/delete item in shop by manager", async function () {
        await resourceLocations[0].addItemToShop(
            itemTokens[0].address,
            CZUSD,
            parseEther("20"),
            parseEther("1")
        );
        const shopItem0Phase0 = await resourceLocations[0].getShopItemAt(0);
        const shopItemCountPhase0 = await resourceLocations[0].getShopItemsCount();
        await resourceLocations[0].setItemInShop(
            0,
            itemTokens[1].address,
            Bandits,
            parseEther("15"),
            parseEther("1.5")
        );
        const shopItem0Phase1 = await resourceLocations[0].getShopItemAt(0);
        const shopItemCountPhase1 = await resourceLocations[0].getShopItemsCount();
        await resourceLocations[0].addItemToShop(
            itemTokens[0].address,
            CZUSD,
            parseEther("12"),
            parseEther("1.2")
        );
        const shopItem0Phase2 = await resourceLocations[0].getShopItemAt(0);
        const shopItem1Phase2 = await resourceLocations[0].getShopItemAt(1);
        const shopItemCountPhase2 = await resourceLocations[0].getShopItemsCount();
        await resourceLocations[0].deleteItemFromShop(0);
        const shopItem0Phase3 = await resourceLocations[0].getShopItemAt(0);
        const shopItemCountPhase3 = await resourceLocations[0].getShopItemsCount();

        await expect(resourceLocations[0].connect(player1).deleteItemFromShop(0)).to.be.reverted;
        await expect(resourceLocations[0].connect(player1).addItemToShop(
            itemTokens[0].address,
            CZUSD,
            parseEther("12"),
            parseEther("1.2")
        )).to.be.reverted;
        await expect(resourceLocations[0].connect(player1).setItemInShop(
            0,
            itemTokens[0].address,
            CZUSD,
            parseEther("12"),
            parseEther("1.2")
        )).to.be.reverted;
        await expect(resourceLocations[0].setItemInShop(
            1,
            itemTokens[0].address,
            CZUSD,
            parseEther("12"),
            parseEther("1.2")
        )).to.be.reverted;
        await expect(resourceLocations[0].deleteItemFromShop(1)).to.be.reverted;

        expect(shopItem0Phase0.item).to.eq(itemTokens[0].address);
        expect(shopItem0Phase0.currency).to.eq(CZUSD);
        expect(shopItem0Phase0.pricePerItemWad).to.eq(parseEther("20"));
        expect(shopItem0Phase0.increasePerItemSold).to.eq(parseEther("1"));
        expect(shopItem0Phase0.totalSold).to.eq(0);
        expect(shopItemCountPhase0).to.eq(1);

        expect(shopItem0Phase1.item).to.eq(itemTokens[1].address);
        expect(shopItem0Phase1.currency).to.eq(Bandits);
        expect(shopItem0Phase1.pricePerItemWad).to.eq(parseEther("15"));
        expect(shopItem0Phase1.increasePerItemSold).to.eq(parseEther("1.5"));
        expect(shopItem0Phase1.totalSold).to.eq(0);
        expect(shopItemCountPhase1).to.eq(1);

        expect(shopItem0Phase2.item).to.eq(itemTokens[1].address);
        expect(shopItem0Phase2.currency).to.eq(Bandits);
        expect(shopItem0Phase2.pricePerItemWad).to.eq(parseEther("15"));
        expect(shopItem0Phase2.increasePerItemSold).to.eq(parseEther("1.5"));
        expect(shopItem0Phase2.totalSold).to.eq(0);
        expect(shopItem1Phase2.item).to.eq(itemTokens[0].address);
        expect(shopItem1Phase2.currency).to.eq(CZUSD);
        expect(shopItem1Phase2.pricePerItemWad).to.eq(parseEther("12"));
        expect(shopItem1Phase2.increasePerItemSold).to.eq(parseEther("1.2"));
        expect(shopItem1Phase2.totalSold).to.eq(0);
        expect(shopItemCountPhase2).to.eq(2);

        expect(shopItem0Phase3.item).to.eq(itemTokens[0].address);
        expect(shopItem0Phase3.currency).to.eq(CZUSD);
        expect(shopItem0Phase3.pricePerItemWad).to.eq(parseEther("12"));
        expect(shopItem0Phase3.increasePerItemSold).to.eq(parseEther("1.2"));
        expect(shopItem0Phase3.totalSold).to.eq(0);
        expect(shopItemCountPhase3).to.eq(1);
    });
    it("Should set/delete fixed destionations", async function () {
        await resourceLocations[0].setFixedDestinations([TownSquare], true);
        const countPhase0 = await resourceLocations[0].getFixedDestinationsCount();
        const index0Phase0 = await resourceLocations[0].getFixedDestinationAt(0);
        await resourceLocations[0].setFixedDestinations([TownSquare], false);
        const countPhase1 = await resourceLocations[0].getFixedDestinationsCount();
        await resourceLocations[0].setFixedDestinations([TownSquare], true);
        await resourceLocations[1].setFixedDestinations([TownSquare], true);
        await resourceLocations[2].setFixedDestinations([TownSquare], true);

        expect(countPhase0).to.eq(1);
        expect(index0Phase0).to.eq(TownSquare);
        expect(countPhase1).to.eq(0);
        await expect(resourceLocations[0].connect(player1).setFixedDestinations([ethers.constants.AddressZero], true)).to.be.reverted;
    });
    it("Should set/delete random destionations", async function () {
        await resourceLocations[0].setRandomDestinations([resourceLocations[1].address, resourceLocations[2].address], true);
        const countPhase0 = await resourceLocations[0].getRandomDestinationsCount();
        const index0Phase0 = await resourceLocations[0].getRandomDestinationAt(0);
        const index1Phase0 = await resourceLocations[0].getRandomDestinationAt(1);
        await resourceLocations[0].setRandomDestinations([resourceLocations[1].address, resourceLocations[2].address], false);
        const countPhase1 = await resourceLocations[0].getRandomDestinationsCount();
        await resourceLocations[0].setFixedDestinations([resourceLocations[1].address, resourceLocations[2].address], true);
        await resourceLocations[1].setFixedDestinations([resourceLocations[0].address, resourceLocations[2].address], true);
        await resourceLocations[2].setFixedDestinations([resourceLocations[1].address, resourceLocations[0].address], true);

        expect(countPhase0).to.eq(2);
        expect(index0Phase0).to.eq(resourceLocations[1].address);
        expect(index1Phase0).to.eq(resourceLocations[2].address);
        expect(countPhase1).to.eq(0);
        await expect(resourceLocations[0].connect(player1).setFixedDestinations([ethers.constants.AddressZero], true)).to.be.reverted;
    });
    it("Should allow move from town to location 0", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        await locationController.connect(player1).move(gangs.address, player1GangId, resourceLocations[0].address);
        const pull = await resourceLocations[0].gangPull(player1GangId);
        const pendingResources = await resourceLocations[0].pendingResources(player1GangId);
        const gangDestination = await resourceLocations[0].gangDestination(player1GangId);
        const isGangPreparingToMove = await resourceLocations[0].isGangPreparingToMove(player1GangId);
        const isGangReadyToMove = await resourceLocations[0].isGangReadyToMove(player1GangId);
        const isGangWorking = await resourceLocations[0].isGangWorking(player1GangId);
        const totalPull = await resourceLocations[0].totalPull();
        console.log(pull)
        expect(pull).to.eq(0);
        expect(pendingResources).to.eq(0);
        expect(gangDestination).to.eq(ethers.constants.AddressZero);
        expect(isGangPreparingToMove).to.be.false;
        expect(isGangReadyToMove).to.be.false;
        expect(isGangWorking).to.be.true;
        expect(totalPull).to.eq(0);
    });
});