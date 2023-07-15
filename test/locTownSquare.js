// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers, config } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");


const { expect } = chai;
const { parseEther, formatEther } = ethers.utils;


describe("locTownSquare", function () {
    let locationcontroller, locTownSquare, location1, location2, location3;
    let gangs;
    let owner, player1, player2, player3;
    let czusdMinter;
    let entityStoreErc20, entityStoreErc721;
    let outlaws;
    before(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        const czGnosisAddr = "0x745A676C5c472b50B50e18D4b59e9AeEEc597046"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [czGnosisAddr],
        })
        czusdMinter = await ethers.getSigner(czGnosisAddr);

        await owner.sendTransaction({
            to: czusdMinter.address,
            value: parseEther("1")
        })

        const LocationController = await ethers.getContractFactory("LocationController");
        locationcontroller = await LocationController.deploy();

        const Gangs = await ethers.getContractFactory("Gangs");
        gangs = await Gangs.deploy(locationcontroller.address);

        const EntityStoreERC20 = await ethers.getContractFactory("EntityStoreERC20");
        entityStoreErc20 = await EntityStoreERC20.deploy(locationcontroller.address);
        const EntityStoreERC721 = await ethers.getContractFactory("EntityStoreERC721");
        entityStoreErc721 = await EntityStoreERC721.deploy(locationcontroller.address);

        outlaws = await ethers.getContractAt("IOutlawsNft", "0x128Bf3854130B8cD23e171041Fc65DeE43a1c194");

        const LocTownSquare = await ethers.getContractFactory("LocTownSquare");
        locTownSquare = await LocTownSquare.deploy(locationcontroller.address, gangs.address, entityStoreErc20.address, entityStoreErc721.address);
        const LocationBase = await ethers.getContractFactory("LocationBase");
        location1 = await LocationBase.deploy(locationcontroller.address);
        location2 = await LocationBase.deploy(locationcontroller.address);
        location3 = await LocationBase.deploy(locationcontroller.address);

        await gangs.grantRole(ethers.utils.id("MINTER_ROLE"), locTownSquare.address);
    });
});