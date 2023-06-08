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


describe("roller", function () {
    let roller;
    before(async function () {

        const Roller = await ethers.getContractFactory("Roller");
        roller = await Roller.deploy();

    });
    it("Roll should be same for uniform and bias if bias is 1 and same seed.", async function () {
        const seed = ethers.utils.id("SEED_1")
        const min = parseEther("0");
        const max = parseEther("100");
        const bias = parseEther("1");
        const rollUniform = await roller.getUniformRoll(seed, min, max);
        const rollBias = await roller.getBiasRoll(seed, min, max, bias);

        expect(rollUniform).to.eq(rollBias);
        expect(rollUniform).to.be.lt(max);
        expect(rollUniform).to.be.gt(min);

        const expectedRand = ethers.BigNumber.from(seed).mod(parseEther("1"));
        expect(rollUniform).to.eq(expectedRand.mul(max.sub(min)).add(min).div(parseEther("1")));
    });
    it("Roll should be lower for rollBias if bias  >1.", async function () {
        const seed = ethers.utils.id("SEED_2")
        const min = parseEther("0");
        const max = parseEther("100");
        const bias = parseEther("2");
        const rollUniform = await roller.getUniformRoll(seed, min, max);
        const rollBias = await roller.getBiasRoll(seed, min, max, bias);

        expect(rollUniform).to.be.gt(rollBias);
        expect(rollUniform).to.be.lt(max);
        expect(rollUniform).to.be.gt(min);
        expect(rollBias).to.be.lt(max);
        expect(rollBias).to.be.gt(min);

        const expectedRand = ethers.BigNumber.from(seed).mod(parseEther("1"));
        expect(rollUniform).to.eq(expectedRand.mul(max.sub(min)).add(min).div(parseEther("1")));
    });
    it("Roll should be greater for rollBias if bias  <1.", async function () {
        const seed = ethers.utils.id("SEED_3")
        const min = parseEther("0");
        const max = parseEther("100");
        const bias = parseEther("0.5");
        const rollUniform = await roller.getUniformRoll(seed, min, max);
        const rollBias = await roller.getBiasRoll(seed, min, max, bias);

        expect(rollUniform).to.be.lt(rollBias);
        expect(rollUniform).to.be.lt(max);
        expect(rollUniform).to.be.gt(min);
        expect(rollBias).to.be.lt(max);
        expect(rollBias).to.be.gt(min);

        console.log(formatEther(rollUniform));
        console.log(formatEther(rollBias));

        const expectedRand = ethers.BigNumber.from(seed).mod(parseEther("1"));
        expect(rollUniform).to.eq(expectedRand.mul(max.sub(min)).add(min).div(parseEther("1")));
    });
    it("Large number of rolls should have an average close to the middle of  max-min.", async function () {
        const seed = ethers.utils.id("SEED_4")
        const min = parseEther("0");
        const max = parseEther("100");

        const rollCount = 1000;

        let newSeed = seed;
        let rollResults = [];
        for (let i = 0; i < rollCount; i++) {
            const roll = await roller.getUniformRoll(newSeed, min, max);
            rollResults.push(roll);
            newSeed = ethers.utils.keccak256(newSeed);
        }

        const sum = rollResults.reduce((prev, curr) => prev.add(curr), parseEther("0"));
        const numUnder25 = rollResults.reduce((prev, curr) => curr.lt(parseEther('25')) ? prev + 1 : prev, 0);
        const numOver75 = rollResults.reduce((prev, curr) => curr.gt(parseEther('75')) ? prev + 1 : prev, 0);

        console.log(numUnder25)
        console.log(numOver75)

        expect(sum.div(rollCount)).to.be.closeTo(parseEther('50'), parseEther('2'));
        expect(numUnder25).to.be.closeTo(rollCount * 0.25, 25);
        expect(numOver75).to.be.closeTo(rollCount * 0.25, 25);
    });

})