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
    it("Should revert if onArrival or onDeparture is not called by location controller", async function () {
        await expect(locTownSquare.LOCATION_CONTROLLER_onArrival(gangs.address, 0, locTownSquare.address)).to.be.revertedWith("Sender must be LC");
        await expect(locTownSquare.LOCATION_CONTROLLER_onDeparture(gangs.address, 0, locTownSquare.address)).to.be.revertedWith("Sender must be LC");
    })
    it("Should be invalid source if spawning and address(0x0) was not set as a valid source", async function () {
        await expect(locTownSquare.connect(player1).spawnGang()).to.be.revertedWith("Invalid source");
    });
    it("Should only allow address with VALID_ROUTE_SETTER to set permissions for routes", async function () {
        await expect(locTownSquare.connect(player1).setValidRoute([ethers.constants.AddressZero], true)).to.be.revertedWith("AccessControl: account " + player1.address.toLowerCase() + " is missing role " + ethers.utils.id("VALID_ROUTE_SETTER"));
    });
    it("Should be invalid entity if entity not set as valid", async function () {
        await locTownSquare.setValidRoute([ethers.constants.AddressZero], true);
        await expect(locTownSquare.connect(player1).spawnGang()).to.be.revertedWith("Invalid entity");
    });
    it("Should only allow address with VALID_ENTITY_SETTER to set permissions for routes", async function () {
        await expect(locTownSquare.connect(player1).setValidEntities([gangs.address], true)).to.be.revertedWith("AccessControl: account " + player1.address.toLowerCase() + " is missing role " + ethers.utils.id("VALID_ENTITY_SETTER"));
    });
    it("Should create new gang at spawn location", async function () {
        await locTownSquare.setValidEntities([gangs.address], true);
        await locTownSquare.connect(player1).spawnGang();
        const ownerOfID0 = await gangs.ownerOf(0);
        const gangsInTownSquareScCount = await gangs.balanceOf(locTownSquare.address);
        const allLocalGangsAtTownSquareLocation = await locationcontroller.viewOnly_getAllLocalEntitiesFor(locTownSquare.address, gangs.address);
        expect(ownerOfID0).to.eq(player1.address);
        expect(gangsInTownSquareScCount).to.eq(0);
        expect(allLocalGangsAtTownSquareLocation.length).to.eq(1);
        expect(allLocalGangsAtTownSquareLocation[0]).to.eq(0);
    });
    it("Should revert move on departure when not nft owner", async function () {
        await expect(locationcontroller.move(gangs.address, 0, location1.address)).to.be.revertedWith("Only entity owner");
    });
    it("Should revert move on departure to invalid location", async function () {
        await expect(locationcontroller.connect(player1).move(gangs.address, 0, location1.address)).to.be.revertedWith("Invalid destination");
    });
    it("Should move to new location", async function () {
        await location1.setValidEntities([gangs.address], true);
        await location1.setValidRoute([locTownSquare.address], true);
        await locTownSquare.setValidRoute([location1.address], true);

        await locationcontroller.connect(player1).move(gangs.address, 0, location1.address);

        const ownerOfID0 = await gangs.ownerOf(0);
        const allLocalGangsAtTownSquareLocation = await locationcontroller.viewOnly_getAllLocalEntitiesFor(locTownSquare.address, gangs.address);
        const allLocalGangsAtLocation1 = await locationcontroller.viewOnly_getAllLocalEntitiesFor(location1.address, gangs.address);
        expect(ownerOfID0).to.eq(player1.address);
        expect(allLocalGangsAtTownSquareLocation.length).to.eq(0);
        expect(allLocalGangsAtLocation1.length).to.eq(1);
        expect(allLocalGangsAtLocation1[0]).to.eq(0);
    });
    it("Should revert move on arrival from invalid location", async function () {
        await locTownSquare.setValidRoute([location1.address], false);
        await expect(locationcontroller.connect(player1).move(gangs.address, 0, locTownSquare.address)).to.be.revertedWith("Invalid source");
    });
});