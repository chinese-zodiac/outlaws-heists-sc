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
    Bandits, Outlaws, Gangs, TownSquare, CZUSD, RngHistory, SilverStore,
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



});