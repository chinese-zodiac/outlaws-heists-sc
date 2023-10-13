// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers, config } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");
const loadJsonFile = require("load-json-file");

const { LocationController, EntityStoreERC20, EntityStoreERC721,
    Bandits, Outlaws, Gangs, TownSquare, CZUSD, RngHistory, SilverStore,
    pancakeswapRouter, pancakeswapFactory} = loadJsonFile.sync("./deployConfig.json");


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
        resourceTokens[0] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Res-Tok-0","RT0");
        resourceTokens[1] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Res-Tok-1","RT1");
        resourceTokens[2] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Res-Tok-2","RT2");
        itemTokens[0] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Itm-Tok-0","IT0");
        itemTokens[1] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Itm-Tok-1","IT1");
        itemTokens[2] = TokenBase.deploy(czDeployerAddr,CZUSD,pancakeswapFactory,"Itm-Tok-2","IT2");

        const LocTemplateResource = await ethers.getContractFactory("LocTemplateResource");
        resourceLocations[0] = LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            TownSquare,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[0],
            roller.address,
            parseEther("1")
        );
        resourceLocations[1] = LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            TownSquare,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[0],
            roller.address,
            parseEther("8")
        );
        resourceLocations[2] = LocTemplateResource.deploy(
            LocationController,
            EntityStoreERC20,
            Gangs,
            TownSquare,
            Bandits,
            rngHistory.address,
            boostedValueCalculator.address,
            resourceTokens[0],
            roller.address,
            parseEther("2500")
        );




        outlaws.connect(czDeployer).grantRole(ethers.utils.id("MANAGER_ROLE"), czDeployer.address);



    });

});