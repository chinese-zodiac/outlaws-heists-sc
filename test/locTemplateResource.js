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
const ether = require('@openzeppelin/test-helpers/src/ether');

const { LocationController, EntityStoreERC20, EntityStoreERC721,
    Bandits, Outlaws, Gangs, TownSquare, CZUSD, RngHistory, SilverStore, USTSD, UstsdAdmin,
    pancakeswapRouter, pancakeswapFactory } = loadJsonFile.sync("./deployconfig.json");


const { expect } = chai;
const { parseEther, formatEther } = ethers.utils;


describe("LocTemplateResource", function () {
    let locationController, rngHistory, boostedValueCalculator, roller;
    let gangs, bandits, outlaws, czusd, ustsd, silverStore;
    let owner, player1, player2, player3;
    let entityStoreErc20, entityStoreErc721;
    let town;
    let czDeployer, czusdMinter, ustsdAdmin;
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
        const ustsdAdminAddr = "0xfC74a37FFF6EA97fF555e5ff996193e12a464431"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ustsdAdminAddr],
        })
        ustsdAdmin = await ethers.getSigner(ustsdAdminAddr);

        await owner.sendTransaction({
            to: czusdMinter.address,
            value: parseEther("1")
        });

        locationController = await ethers.getContractAt("LocationController", LocationController);
        czusd = await ethers.getContractAt("CZUsd", CZUSD);
        outlaws = await ethers.getContractAt("IOutlawsNft", Outlaws);
        gangs = await ethers.getContractAt("Gangs", Gangs);
        bandits = await ethers.getContractAt("TokenBase", Bandits);
        ustsd = await ethers.getContractAt("JsonNftTemplate", USTSD);
        entityStoreErc20 = await ethers.getContractAt("EntityStoreERC20", EntityStoreERC20);
        entityStoreErc721 = await ethers.getContractAt("EntityStoreERC721", EntityStoreERC721);
        town = await ethers.getContractAt("LocTownSquare", TownSquare);
        silverStore = await ethers.getContractAt("LocSilverStore", SilverStore);

        await bandits.connect(czDeployer).grantRole(ethers.utils.id("MINTER_ROLE"), owner.address);
        await ustsd.connect(ustsdAdmin).grantRole(ethers.utils.id("MANAGER_ROLE"), owner.address);

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
        await resourceTokens[0].grantRole(ethers.utils.id("MINTER_ROLE"), await resourceLocations[0].resourceStakingPool());
        await resourceTokens[1].grantRole(ethers.utils.id("MINTER_ROLE"), await resourceLocations[1].resourceStakingPool());
        await resourceTokens[2].grantRole(ethers.utils.id("MINTER_ROLE"), await resourceLocations[2].resourceStakingPool());

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
        await silverStore.connect(czDeployer).setValidRoute([resourceLocations[0].address], true);

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
    /*it("Should set/delete item in shop by manager", async function () {
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
    });*/
    it("Should set/delete fixed destionations", async function () {
        await resourceLocations[0].setFixedDestinations([TownSquare], true);
        const countPhase0 = await resourceLocations[0].getFixedDestinationsCount();
        const index0Phase0 = await resourceLocations[0].getFixedDestinationAt(0);
        await resourceLocations[0].setFixedDestinations([TownSquare], false);
        const countPhase1 = await resourceLocations[0].getFixedDestinationsCount();
        await resourceLocations[0].setFixedDestinations([TownSquare, SilverStore], true);
        await resourceLocations[1].setFixedDestinations([TownSquare, SilverStore], true);
        await resourceLocations[2].setFixedDestinations([TownSquare, SilverStore], true);

        expect(countPhase0).to.eq(1);
        expect(index0Phase0).to.eq(TownSquare);
        expect(countPhase1).to.eq(0);
        await expect(resourceLocations[0].connect(player1).setFixedDestinations([ethers.constants.AddressZero], true)).to.be.reverted;
    });
    /*it("Should set/delete random destionations", async function () {
        await resourceLocations[0].setRandomDestinations([resourceLocations[1].address, resourceLocations[2].address], true);
        const countPhase0 = await resourceLocations[0].getRandomDestinationsCount();
        const index0Phase0 = await resourceLocations[0].getRandomDestinationAt(0);
        const index1Phase0 = await resourceLocations[0].getRandomDestinationAt(1);
        await resourceLocations[0].setRandomDestinations([resourceLocations[1].address, resourceLocations[2].address], false);
        const countPhase1 = await resourceLocations[0].getRandomDestinationsCount();
        await resourceLocations[0].setRandomDestinations([resourceLocations[1].address, resourceLocations[2].address], true);
        await resourceLocations[1].setRandomDestinations([resourceLocations[0].address, resourceLocations[2].address], true);
        await resourceLocations[2].setRandomDestinations([resourceLocations[1].address, resourceLocations[0].address], true);

        expect(countPhase0).to.eq(2);
        expect(index0Phase0).to.eq(resourceLocations[1].address);
        expect(index1Phase0).to.eq(resourceLocations[2].address);
        expect(countPhase1).to.eq(0);
        await expect(resourceLocations[0].connect(player1).setFixedDestinations([ethers.constants.AddressZero], true)).to.be.reverted;
    });*/
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
        expect(pull).to.eq(0);
        expect(pendingResources).to.eq(0);
        expect(gangDestination).to.eq(ethers.constants.AddressZero);
        expect(isGangPreparingToMove).to.be.false;
        expect(isGangReadyToMove).to.be.false;
        expect(isGangWorking).to.be.true;
        expect(totalPull).to.eq(0);
    });
    it("Should allow move from loc0 to town only after travel time passed", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        await expect(locationController.connect(player1).move(gangs.address, player1GangId, town.address)).to.be.reverted;
        await resourceLocations[0].connect(player1).prepareToMoveGangToFixedDestination(player1GangId, town.address);
        const isGangPreparingToMoveP0 = await resourceLocations[0].isGangPreparingToMove(player1GangId);
        const isGangReadyToMoveP0 = await resourceLocations[0].isGangReadyToMove(player1GangId);
        const isGangWorkingP0 = await resourceLocations[0].isGangWorking(player1GangId);
        await expect(locationController.connect(player1).move(gangs.address, player1GangId, town.address)).to.be.reverted;
        await time.increase(time.duration.hours(4));
        await time.advanceBlock();
        const isGangPreparingToMoveP1 = await resourceLocations[0].isGangPreparingToMove(player1GangId);
        const isGangReadyToMoveP1 = await resourceLocations[0].isGangReadyToMove(player1GangId);
        const isGangWorkingP1 = await resourceLocations[0].isGangWorking(player1GangId);
        await locationController.connect(player1).move(gangs.address, player1GangId, town.address);
        const isGangPreparingToMoveP2 = await resourceLocations[0].isGangPreparingToMove(player1GangId);
        const isGangReadyToMoveP2 = await resourceLocations[0].isGangReadyToMove(player1GangId);
        const isGangWorkingP2 = await resourceLocations[0].isGangWorking(player1GangId);
        expect(isGangPreparingToMoveP0).to.be.true;
        expect(isGangReadyToMoveP0).to.be.false;
        expect(isGangWorkingP0).to.be.false;
        expect(isGangPreparingToMoveP1).to.be.true;
        expect(isGangReadyToMoveP1).to.be.true;
        expect(isGangWorkingP1).to.be.false;
        expect(isGangPreparingToMoveP2).to.be.false;
        expect(isGangReadyToMoveP2).to.be.false;
        expect(isGangWorkingP2).to.be.false;
    });
    it("Should properly have the correct boosted val for l0, after adding bandits and ustsd", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        const player2GangId = await gangs.tokenOfOwnerByIndex(player2.address, 0);
        const player3GangId = await gangs.tokenOfOwnerByIndex(player3.address, 0);
        await bandits.mint(player1.address, parseEther("100"));
        await bandits.mint(player2.address, parseEther("250"));
        await bandits.mint(player3.address, parseEther("400"));
        await bandits.connect(player1).approve(town.address, parseEther("100"));
        await bandits.connect(player2).approve(town.address, parseEther("250"));
        await bandits.connect(player3).approve(town.address, parseEther("400"));
        await town.connect(player1).depositBandits(player1GangId, parseEther("100"));
        await town.connect(player2).depositBandits(player2GangId, parseEther("250"));
        await town.connect(player3).depositBandits(player3GangId, parseEther("400"));

        await locationController.connect(player1).move(gangs.address, player1GangId, silverStore.address);
        await locationController.connect(player2).move(gangs.address, player2GangId, silverStore.address);
        await locationController.connect(player3).move(gangs.address, player3GangId, silverStore.address);

        const ustsdTotalSupply = toNum(await ustsd.totalSupply());
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.add("", "");
        await ustsd.transferFrom(owner.address, player1.address, ustsdTotalSupply);
        await ustsd.transferFrom(owner.address, player2.address, ustsdTotalSupply + 1);
        await ustsd.transferFrom(owner.address, player2.address, ustsdTotalSupply + 2);
        await ustsd.transferFrom(owner.address, player3.address, ustsdTotalSupply + 3);
        await ustsd.transferFrom(owner.address, player3.address, ustsdTotalSupply + 4);
        await ustsd.transferFrom(owner.address, player3.address, ustsdTotalSupply + 5);
        await ustsd.transferFrom(owner.address, player3.address, ustsdTotalSupply + 6);

        await ustsd.connect(player1).setApprovalForAll(silverStore.address, true);
        await ustsd.connect(player2).setApprovalForAll(silverStore.address, true);
        await ustsd.connect(player3).setApprovalForAll(silverStore.address, true);

        await silverStore.connect(player1).depositUstsd(player1GangId, [ustsdTotalSupply]);
        await silverStore.connect(player2).depositUstsd(player2GangId, [ustsdTotalSupply + 1, ustsdTotalSupply + 2]);
        await silverStore.connect(player3).depositUstsd(player3GangId, [ustsdTotalSupply + 3, ustsdTotalSupply + 4, ustsdTotalSupply + 5, ustsdTotalSupply + 6]);

        const gangPullPlayer1 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PULL"), gangs.address, player1GangId);
        const gangPullPlayer2 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PULL"), gangs.address, player2GangId);
        const gangPullPlayer3 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PULL"), gangs.address, player3GangId);

        const gangProdPlayer1 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PROD_DAILY"), gangs.address, player1GangId);
        const gangProdPlayer2 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PROD_DAILY"), gangs.address, player2GangId);
        const gangProdPlayer3 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_PROD_DAILY"), gangs.address, player3GangId);

        const gangPowerPlayer1 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_POWER"), gangs.address, player1GangId);
        const gangPowerPlayer2 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_POWER"), gangs.address, player2GangId);
        const gangPowerPlayer3 = await boostedValueCalculator.getBoostedValue(ethers.constants.AddressZero, ethers.utils.id("BOOSTER_GANG_POWER"), gangs.address, player3GangId);

        expect(gangPullPlayer1).to.eq(gangPowerPlayer1);
        expect(gangPullPlayer2).to.eq(gangPowerPlayer2);
        expect(gangPullPlayer3).to.eq(gangPowerPlayer3);
        expect(gangProdPlayer1).to.eq(0);
        expect(gangProdPlayer2).to.eq(0);
        expect(gangProdPlayer3).to.eq(0);
        expect(gangPowerPlayer1).to.eq(parseEther("100").mul(10000 + 2500 + 1000).div(10000));
        expect(gangPowerPlayer2).to.eq(parseEther("250").mul(10000 + 5000 + 2000).div(10000));
        expect(gangPowerPlayer3).to.eq(parseEther("400").mul(10000 + 40000 + 4000).div(10000));
    });
    it("Should allow move from town to location 0 for all gangs", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        const player2GangId = await gangs.tokenOfOwnerByIndex(player2.address, 0);
        const player3GangId = await gangs.tokenOfOwnerByIndex(player3.address, 0);
        await locationController.connect(player1).move(gangs.address, player1GangId, resourceLocations[0].address);
        await locationController.connect(player2).move(gangs.address, player2GangId, resourceLocations[0].address);
        await locationController.connect(player3).move(gangs.address, player3GangId, resourceLocations[0].address);
        const player1GangPull = await resourceLocations[0].gangPull(player1GangId);
        const player2GangPull = await resourceLocations[0].gangPull(player2GangId);
        const player3GangPull = await resourceLocations[0].gangPull(player3GangId);
        const totalPull = await resourceLocations[0].totalPull();
        const player1GangRpd = await resourceLocations[0].gangResourcesPerDay(player1GangId);
        const player2GangRpd = await resourceLocations[0].gangResourcesPerDay(player2GangId);
        const player3GangRpd = await resourceLocations[0].gangResourcesPerDay(player3GangId);
        expect(player1GangPull).to.eq(parseEther("100").mul(10000 + 2500 + 1000).div(10000));
        expect(player2GangPull).to.eq(parseEther("250").mul(10000 + 5000 + 2000).div(10000));
        expect(player3GangPull).to.eq(parseEther("400").mul(10000 + 40000 + 4000).div(10000));
        expect(totalPull).to.eq(player1GangPull.add(player2GangPull).add(player3GangPull));
        expect(player1GangRpd).to.eq(player1GangPull.mul(parseEther('1')).div(totalPull));
        expect(player2GangRpd).to.eq(player2GangPull.mul(parseEther('1')).div(totalPull));
        expect(player3GangRpd).to.eq(player3GangPull.mul(parseEther('1')).div(totalPull));
    });
    it("Should claim after 1 day", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        const player1GangPull = await resourceLocations[0].gangPull(player1GangId);
        const totalPull = await resourceLocations[0].totalPull();
        const expectedDaily = player1GangPull.mul(parseEther('1')).div(totalPull);
        const initialPending = await resourceLocations[0].pendingResources(player1GangId);
        await time.increase(time.duration.hours(24));
        const finalPending = await resourceLocations[0].pendingResources(player1GangId);
        await resourceLocations[0].connect(player1).claimPendingResources(player1GangId);
        const resourceBal = await entityStoreErc20.getStoredER20WadFor(gangs.address, player1GangId, resourceTokens[0].address);
        const postClaimPending = await resourceLocations[0].pendingResources(player1GangId);

        expect(postClaimPending).to.eq(0);
        expect(resourceBal).to.be.closeTo(finalPending, parseEther("0.0001"));
        expect(expectedDaily).to.be.closeTo(finalPending.sub(initialPending), parseEther("0.0001"));
    });
    it("Should start attack", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        const player3GangId = await gangs.tokenOfOwnerByIndex(player3.address, 0);
        await expect(resourceLocations[0].connect(player1).startAttack(player3GangId, player1GangId)).to.be.reverted;
        resourceLocations[0].connect(player3).startAttack(player3GangId, player1GangId);
        const now = await time.latest();
        const lastAttack = await resourceLocations[0].gangLastAttack(player3GangId);
        const gangAttackCooldown = await resourceLocations[0].gangAttackCooldown(player3GangId);
        const gangAttackTarget = await resourceLocations[0].gangAttackTarget(player3GangId);
        await expect(resourceLocations[0].connect(player3).startAttack(player3GangId, player1GangId)).to.be.reverted;

        expect(lastAttack).to.eq(now.toNumber() + 1);
        expect(gangAttackTarget).to.eq(player1GangId);
        expect(gangAttackCooldown).to.eq(now.add(time.duration.hours(4)).toNumber() + 1);
    });
    it("Should resolve attack", async function () {
        const player1GangId = await gangs.tokenOfOwnerByIndex(player1.address, 0);
        const player2GangId = await gangs.tokenOfOwnerByIndex(player2.address, 0);
        const player3GangId = await gangs.tokenOfOwnerByIndex(player3.address, 0);
        await time.increase(time.duration.minutes(1));
        await expect(resourceLocations[0].connect(player3).resolveAttack(player3GangId)).to.be.reverted;
        await rngHistory.setRandomWord(100);
        await resourceLocations[0].connect(player3).resolveAttack(player3GangId);
        await expect(resourceLocations[0].connect(player3).startAttack(player3GangId, player1GangId)).to.be.reverted;
        const gang1Bandits = await entityStoreErc20.getStoredER20WadFor(gangs.address, player1GangId, bandits.address);
        const gang3Bandits = await entityStoreErc20.getStoredER20WadFor(gangs.address, player3GangId, bandits.address);
        const gangLastAttack = await resourceLocations[0].gangLastAttack(player3GangId);
        const gangAttackTarget = await resourceLocations[0].gangAttackTarget(player3GangId);
        const expectedWinAmt = parseEther("100").mul(1000).div(10000);
        const expectedBurnAmt = parseEther("400").mul(200).div(10000);
        const expectedFinalGang1Bal = parseEther("100").sub(expectedWinAmt);
        const expectedFinalGang3Bal = parseEther("400").sub(expectedBurnAmt).add(expectedWinAmt);
        const player1GangPull = await resourceLocations[0].gangPull(player1GangId);
        const player2GangPull = await resourceLocations[0].gangPull(player2GangId);
        const player3GangPull = await resourceLocations[0].gangPull(player3GangId);
        const attackLogLength = await resourceLocations[0].getAttackLogLength();
        const attackAt0 = await resourceLocations[0].getAttackAt(0);
        const attackLog = await resourceLocations[0].viewOnly_getAllAttackLog();
        const attack = attackLog[0];
        expect(gang1Bandits).to.eq(expectedFinalGang1Bal);
        expect(gang3Bandits).to.eq(expectedFinalGang3Bal);
        expect(gangLastAttack).to.eq(0);
        expect(gangAttackTarget).to.eq(ethers.constants.AddressZero);
        expect(player1GangPull).to.eq(expectedFinalGang1Bal.mul(10000 + 2500 + 1000).div(10000));
        expect(player2GangPull).to.eq(parseEther("250").mul(10000 + 5000 + 2000).div(10000));
        expect(player3GangPull).to.eq(expectedFinalGang3Bal.mul(10000 + 40000 + 4000).div(10000));
        expect(attackLogLength).to.eq(1);
        expect(attackAt0.attackerGangId).to.eq(player3GangId);
        expect(attack.attackerGangId).to.eq(player3GangId);
        expect(attack.defenderGangId).to.eq(player1GangId);
        expect(attack.cost).to.eq(expectedBurnAmt);
        expect(attack.winnings).to.eq(expectedWinAmt);
    });
});