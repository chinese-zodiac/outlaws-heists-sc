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


describe("locationcontroller", function () {
    let locationcontroller, location1, location2, location3;
    let entity1, entity2;
    let owner, player1, player2, player3;
    before(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        const LocationController = await ethers.getContractFactory("LocationController");
        locationcontroller = await LocationController.deploy();

        const LocationBase = await ethers.getContractFactory("LocationBase");
        location1 = await LocationBase.deploy(locationcontroller.address);
        location2 = await LocationBase.deploy(locationcontroller.address);
        location3 = await LocationBase.deploy(locationcontroller.address);

        const Entity = await ethers.getContractFactory("Entity");
        entity1 = await Entity.deploy("Entity1", "E1", locationcontroller.address);
        await entity1.grantRole(ethers.utils.id("MINTER_ROLE"), owner.address);
        entity2 = await Entity.deploy("Entity2", "E2", locationcontroller.address);
        await entity2.grantRole(ethers.utils.id("MINTER_ROLE"), owner.address);
    });
    it("LocationController should allow entitys to be spawned to a location", async function () {
        await location1.setValidRoute([
            ethers.constants.AddressZero,
            location2.address,
            location3.address
        ], true);

        await location2.setValidRoute([
            ethers.constants.AddressZero,
            location1.address,
            location3.address
        ], true);

        await location3.setValidRoute([
            ethers.constants.AddressZero,
            location1.address,
            location2.address
        ], true);

        await entity1.mint(player1.address, location1.address);
        await entity2.mint(player1.address, location1.address);
        await entity1.mint(player2.address, location1.address);
        await entity2.mint(player3.address, location2.address);
        await entity1.mint(player3.address, location3.address);

        const location1Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location1.address, entity1.address);
        const location1Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location1.address, entity2.address);
        const location2Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location2.address, entity1.address);
        const location2Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location2.address, entity2.address);
        const location3Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location3.address, entity1.address);
        const location3Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location3.address, entity2.address);

        const entity1Id0Location = await locationcontroller.getEntityLocation(entity1.address, 0);
        const entity1Id1Location = await locationcontroller.getEntityLocation(entity1.address, 1);
        const entity1Id2Location = await locationcontroller.getEntityLocation(entity1.address, 2);
        const entity2Id0Location = await locationcontroller.getEntityLocation(entity2.address, 0);
        const entity2Id1Location = await locationcontroller.getEntityLocation(entity2.address, 1);


        const location1Entity1Count = await locationcontroller.getLocalEntityCountFor(location1.address, entity1.address);
        const location1Entity2Count = await locationcontroller.getLocalEntityCountFor(location1.address, entity2.address);
        const location2Entity1Count = await locationcontroller.getLocalEntityCountFor(location2.address, entity1.address);
        const location2Entity2Count = await locationcontroller.getLocalEntityCountFor(location2.address, entity2.address);
        const location3Entity1Count = await locationcontroller.getLocalEntityCountFor(location3.address, entity1.address);
        const location3Entity2Count = await locationcontroller.getLocalEntityCountFor(location3.address, entity2.address);



        expect(location1Entity1s.length).to.eq(2);
        expect(location1Entity2s.length).to.eq(1);
        expect(location2Entity1s.length).to.eq(0);
        expect(location2Entity2s.length).to.eq(1);
        expect(location3Entity1s.length).to.eq(1);
        expect(location3Entity2s.length).to.eq(0);


        expect(location1Entity1Count).to.eq(2);
        expect(location1Entity2Count).to.eq(1);
        expect(location2Entity1Count).to.eq(0);
        expect(location2Entity2Count).to.eq(1);
        expect(location3Entity1Count).to.eq(1);
        expect(location3Entity2Count).to.eq(0);

        expect(location1Entity1s[0]).to.eq(0);
        expect(location1Entity1s[1]).to.eq(1);
        expect(location1Entity2s[0]).to.eq(0);
        expect(location2Entity2s[0]).to.eq(1);
        expect(location3Entity1s[0]).to.eq(2);

        expect(entity1Id0Location).to.eq(location1.address);
        expect(entity1Id1Location).to.eq(location1.address);
        expect(entity1Id2Location).to.eq(location3.address);
        expect(entity2Id0Location).to.eq(location1.address);
        expect(entity2Id1Location).to.eq(location2.address);
    });
    it("LocationController should allow entitys to be moved to a new location by owner.", async function () {
        await locationcontroller.connect(player1).move(entity1.address, 0, location2.address);
        await locationcontroller.connect(player2).move(entity1.address, 1, location2.address);


        const location1Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location1.address, entity1.address);
        const location1Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location1.address, entity2.address);
        const location2Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location2.address, entity1.address);
        const location2Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location2.address, entity2.address);
        const location3Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location3.address, entity1.address);
        const location3Entity2s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location3.address, entity2.address);


        expect(location1Entity1s.length).to.eq(0);
        expect(location1Entity2s.length).to.eq(1);
        expect(location2Entity1s.length).to.eq(2);
        expect(location2Entity2s.length).to.eq(1);
        expect(location3Entity1s.length).to.eq(1);
        expect(location3Entity2s.length).to.eq(0);
    });
    it("LocationController should revert when attempting move by non owner.", async function () {
        await expect(locationcontroller.move(entity1.address, 0, location1.address)).to.be.reverted;
    });
    it("LocationController should allow despawn.", async function () {
        await locationcontroller.connect(player1).despawn(entity1.address, 0);
        const location2Entity1s =
            await locationcontroller.viewOnly_getAllLocalEntitiesFor(location2.address, entity1.address);
        expect(location2Entity1s.length).to.eq(1);

    });
});