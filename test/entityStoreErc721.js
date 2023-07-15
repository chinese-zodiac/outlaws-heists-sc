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


describe("entityStoreErc721", function () {
    let locationcontroller, locTownSquare, location1, location2, location3;
    let gangs;
    let owner, player1, player2, player3;
    let czusdMinter;
    let entityStoreErc20, entityStoreErc721;
    let entity1, entity2;
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

        const Entity = await ethers.getContractFactory("ERC721PresetMinterPauserAutoId");
        entity1 = await Entity.deploy("Entity1", "E1", "");
        entity2 = await Entity.deploy("Entity2", "E2", "");

        const EntityStoreERC20 = await ethers.getContractFactory("EntityStoreERC20");
        entityStoreErc20 = await EntityStoreERC20.deploy(locationcontroller.address);
        const EntityStoreERC721 = await ethers.getContractFactory("EntityStoreERC721");
        entityStoreErc721 = await EntityStoreERC721.deploy(locationcontroller.address);

        const LocTownSquare = await ethers.getContractFactory("LocTownSquare");
        locTownSquare = await LocTownSquare.deploy(locationcontroller.address, gangs.address, entityStoreErc20.address, entityStoreErc721.address);
        const LocationBase = await ethers.getContractFactory("LocationBase");
        location1 = await LocationBase.deploy(locationcontroller.address);
        location2 = await LocationBase.deploy(locationcontroller.address);
        location3 = await LocationBase.deploy(locationcontroller.address);
        await location1.setValidRoute([
            ethers.constants.AddressZero,
            location2.address,
            location3.address,
            locTownSquare.address
        ], true);
        await location2.setValidRoute([
            ethers.constants.AddressZero,
            location1.address,
            location3.address,
            locTownSquare.address
        ], true);
        await location3.setValidRoute([
            ethers.constants.AddressZero,
            location1.address,
            location2.address,
            locTownSquare.address
        ], true);
        await locTownSquare.setValidRoute([
            ethers.constants.AddressZero,
            location1.address,
            location2.address,
            location3.address
        ], true);
        await location1.setValidEntities([gangs.address], true);
        await location2.setValidEntities([gangs.address], true);
        await location3.setValidEntities([gangs.address], true);
        await locTownSquare.setValidEntities([gangs.address], true);

        await gangs.grantRole(ethers.utils.id("MINTER_ROLE"), locTownSquare.address);
    });
    it("Should revert deposit and withdraw if not from proper location or not nft owner", async function () {
        await entity1.mint(player1.address);
        await entity1.mint(player1.address);
        await locTownSquare.connect(player1).spawnGang();
        await entity1.connect(player1).setApprovalForAll(locTownSquare.address, true);
        await expect(entityStoreErc721.connect(player1).deposit(gangs.address, 0, entity1.address, [0])).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity1.address, [0, 1, 2])).to.be.reverted;
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity1.address, [2])).to.be.reverted;
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity2.address, [0])).to.be.reverted;
        await expect(locTownSquare.depositErc721(gangs.address, 0, entity1.address, [0])).to.be.revertedWith("Only gang owner");
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 1, entity1.address, [0])).to.be.reverted;
        await expect(locTownSquare.connect(player1).withdrawErc721(gangs.address, 0, entity1.address, [0])).to.be.reverted;
    });
    it("Should deposit", async function () {
        await entity2.mint(player1.address);
        await entity2.connect(player1).setApprovalForAll(locTownSquare.address, true);
        await locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity2.address, [0]);
        await locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity1.address, [1, 0]);
        const getStoredERC721At0 = await entityStoreErc721.getStoredERC721At(gangs.address, 0, entity1.address, 0);
        const getStoredERC721At1 = await entityStoreErc721.getStoredERC721At(gangs.address, 0, entity1.address, 1);
        const getStoredERC721CountFor = await entityStoreErc721.getStoredERC721CountFor(gangs.address, 0, entity1.address);
        const viewOnly_getAllStoredEntity1 = await entityStoreErc721.viewOnly_getAllStoredERC721(gangs.address, 0, entity1.address);
        const balanceOf = await entity1.balanceOf(entityStoreErc721.address);
        const viewOnly_getAllStoredEntity2 = await entityStoreErc721.viewOnly_getAllStoredERC721(gangs.address, 0, entity2.address);
        expect(getStoredERC721At0).to.eq(1);
        expect(getStoredERC721At1).to.eq(0);
        expect(getStoredERC721CountFor).to.eq(2);
        expect(viewOnly_getAllStoredEntity1.length).to.eq(2);
        expect(viewOnly_getAllStoredEntity1[0]).to.eq(1);
        expect(viewOnly_getAllStoredEntity1[1]).to.eq(0);
        expect(viewOnly_getAllStoredEntity2.length).to.eq(1);
        expect(viewOnly_getAllStoredEntity2[0]).to.eq(0);
        expect(balanceOf).to.eq(2);
    });
    it("Should revert deposit and withdraw if not from proper location or not nft owner", async function () {
        await expect(entityStoreErc721.connect(player1).deposit(gangs.address, 0, entity1.address, [0])).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity1.address, [0, 1, 2])).to.be.reverted;
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity1.address, [2])).to.be.reverted;
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity2.address, [0])).to.be.reverted;
        await expect(locTownSquare.depositErc721(gangs.address, 0, entity1.address, [0])).to.be.revertedWith("Only gang owner");
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 1, entity1.address, [0])).to.be.reverted;
        await expect(locTownSquare.connect(player1).depositErc721(gangs.address, 0, entity2.address, [3])).to.be.reverted;
        await expect(locTownSquare.connect(player1).withdrawErc721(gangs.address, 0, entity1.address, [2])).to.be.reverted;
    });
    it("Should withdraw", async function () {
        await locTownSquare.connect(player1).withdrawErc721(gangs.address, 0, entity1.address, [1]);
        const getStoredERC721At0 = await entityStoreErc721.getStoredERC721At(gangs.address, 0, entity1.address, 0);
        const getStoredERC721CountFor = await entityStoreErc721.getStoredERC721CountFor(gangs.address, 0, entity1.address);
        const viewOnly_getAllStoredEntity1 = await entityStoreErc721.viewOnly_getAllStoredERC721(gangs.address, 0, entity1.address);
        const balanceOf = await entity1.balanceOf(entityStoreErc721.address);
        const viewOnly_getAllStoredEntity2 = await entityStoreErc721.viewOnly_getAllStoredERC721(gangs.address, 0, entity2.address);
        expect(getStoredERC721At0).to.eq(0);
        expect(getStoredERC721CountFor).to.eq(1);
        expect(viewOnly_getAllStoredEntity1.length).to.eq(1);
        expect(viewOnly_getAllStoredEntity1[0]).to.eq(0);
        expect(viewOnly_getAllStoredEntity2.length).to.eq(1);
        expect(viewOnly_getAllStoredEntity2[0]).to.eq(0);
        expect(balanceOf).to.eq(1);
    });
});