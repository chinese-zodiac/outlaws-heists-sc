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


describe("entityStoreErc20", function () {
    let locationcontroller, locTownSquare, location1, location2, location3;
    let gangs;
    let owner, player1, player2, player3;
    let czusdSc, czusdMinter;
    let entityStoreErc20, entityStoreErc721;
    before(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        const czGnosisAddr = "0x745A676C5c472b50B50e18D4b59e9AeEEc597046"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [czGnosisAddr],
        })
        const czusdMinter = await ethers.getSigner(czGnosisAddr);

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

        czusdSc = await ethers.getContractAt("CZUsd", "0xE68b79e51bf826534Ff37AA9CeE71a3842ee9c70");

        await czusdSc.connect(czusdMinter).mint(player1.address, parseEther("100"));
        await czusdSc.connect(czusdMinter).mint(player2.address, parseEther("100"));
        await czusdSc.connect(czusdMinter).mint(player3.address, parseEther("100"));
        await czusdSc.connect(czusdMinter).mint(czusdMinter.address, parseEther("100"));

        await gangs.grantRole(ethers.utils.id("MINTER_ROLE"), locTownSquare.address);
    });
    it("Should revert deposit and withdraw if not from proper location or not enough balance", async function () {
        await locTownSquare.connect(player1).spawnGang();
        await czusdSc.connect(player1).approve(locTownSquare.address, ethers.constants.MaxUint256);

        await expect(entityStoreErc20.deposit(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(entityStoreErc20.connect(player1).deposit(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).depositErc20(gangs.address, 0, czusdSc.address, parseEther("101"))).to.be.reverted;
        await expect(entityStoreErc20.withdraw(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).withdrawErc20(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.reverted;
    });
    it("Should deposit", async function () {
        await locTownSquare.connect(player1).depositErc20(gangs.address, 0, czusdSc.address, 1);
        let playerBal = await czusdSc.balanceOf(player1.address);
        let locBal = await czusdSc.balanceOf(locTownSquare.address);
        let storeBal = await czusdSc.balanceOf(entityStoreErc20.address);
        let getSharesPerToken = await entityStoreErc20.getSharesPerToken(czusdSc.address);
        let totalShares = await entityStoreErc20.totalShares(czusdSc.address);
        let getStoredCzusdFor = await entityStoreErc20.getStoredER20WadFor(gangs.address, 0, czusdSc.address);

        expect(playerBal).to.eq(parseEther("100").sub(1));
        expect(locBal).to.eq(0);
        expect(storeBal).to.eq(1);
        expect(getSharesPerToken).to.eq(10 ** 8);
        expect(totalShares).to.eq(10 ** 8);
        expect(getStoredCzusdFor).to.eq(1);
    });
    it("Should revert after deposit if not proper location or balance", async function () {
        await expect(entityStoreErc20.deposit(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(entityStoreErc20.connect(player1).deposit(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).depositErc20(gangs.address, 0, czusdSc.address, parseEther("101"))).to.be.reverted;
        await expect(entityStoreErc20.withdraw(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player1).withdrawErc20(gangs.address, 0, czusdSc.address, parseEther("1"))).to.be.reverted;
    });
    it("Should withdraw", async function () {
        await locTownSquare.connect(player1).depositErc20(gangs.address, 0, czusdSc.address, parseEther("1"));
        await locTownSquare.connect(player1).withdrawErc20(gangs.address, 0, czusdSc.address, parseEther("1"));
        let playerBal = await czusdSc.balanceOf(player1.address);
        let locBal = await czusdSc.balanceOf(locTownSquare.address);
        let storeBal = await czusdSc.balanceOf(entityStoreErc20.address);
        let getSharesPerToken = await entityStoreErc20.getSharesPerToken(czusdSc.address);
        let totalShares = await entityStoreErc20.totalShares(czusdSc.address);
        let getStoredCzusdFor = await entityStoreErc20.getStoredER20WadFor(gangs.address, 0, czusdSc.address);

        expect(playerBal).to.eq(parseEther("100").sub(1));
        expect(locBal).to.eq(0);
        expect(storeBal).to.eq(1);
        expect(getSharesPerToken).to.eq(10 ** 8);
        expect(totalShares).to.eq(10 ** 8);
        expect(getStoredCzusdFor).to.eq(1);
    });
    it("Should deposit for player2", async function () {
        await locTownSquare.connect(player2).spawnGang();
        await czusdSc.connect(player2).approve(locTownSquare.address, ethers.constants.MaxUint256);

        await locTownSquare.connect(player2).depositErc20(gangs.address, 1, czusdSc.address, parseEther("0.1"));
        let playerBal = await czusdSc.balanceOf(player2.address);
        let locBal = await czusdSc.balanceOf(locTownSquare.address);
        let storeBal = await czusdSc.balanceOf(entityStoreErc20.address);
        let getSharesPerToken = await entityStoreErc20.getSharesPerToken(czusdSc.address);
        let totalShares = await entityStoreErc20.totalShares(czusdSc.address);
        let getStoredCzusdFor = await entityStoreErc20.getStoredER20WadFor(gangs.address, 1, czusdSc.address);

        expect(playerBal).to.eq(parseEther("100").sub(parseEther("0.1")));
        expect(locBal).to.eq(0);
        expect(storeBal).to.eq(parseEther("0.1").add(1));
        expect(getSharesPerToken).to.eq(10 ** 8);
        expect(getStoredCzusdFor).to.eq(parseEther("0.1"));
        expect(totalShares).to.eq(parseEther("0.1").add(1).mul(getSharesPerToken));
    });
    it("Should revert after deposit if not proper location or balance for player2", async function () {
        await expect(entityStoreErc20.deposit(gangs.address, 1, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(entityStoreErc20.connect(player2).deposit(gangs.address, 1, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player2).depositErc20(gangs.address, 1, czusdSc.address, parseEther("101"))).to.be.reverted;
        await expect(entityStoreErc20.withdraw(gangs.address, 1, czusdSc.address, parseEther("1"))).to.be.revertedWith("Only entity's location");
        await expect(locTownSquare.connect(player2).withdrawErc20(gangs.address, 1, czusdSc.address, parseEther("1"))).to.be.reverted;
    });
    it("Should withdraw for player2", async function () {
        await locTownSquare.connect(player2).depositErc20(gangs.address, 1, czusdSc.address, parseEther("1"));
        await locTownSquare.connect(player2).withdrawErc20(gangs.address, 1, czusdSc.address, parseEther("1"));
        let playerBal = await czusdSc.balanceOf(player2.address);
        let locBal = await czusdSc.balanceOf(locTownSquare.address);
        let storeBal = await czusdSc.balanceOf(entityStoreErc20.address);
        let getSharesPerToken = await entityStoreErc20.getSharesPerToken(czusdSc.address);
        let totalShares = await entityStoreErc20.totalShares(czusdSc.address);
        let getStoredCzusdFor = await entityStoreErc20.getStoredER20WadFor(gangs.address, 1, czusdSc.address);

        expect(playerBal).to.eq(parseEther("100").sub(parseEther("0.1")));
        expect(locBal).to.eq(0);
        expect(storeBal).to.eq(parseEther("0.1").add(1));
        expect(getSharesPerToken).to.eq(10 ** 8);
        expect(totalShares).to.eq(parseEther("0.1").add(1).mul(getSharesPerToken));
        expect(getStoredCzusdFor).to.eq(parseEther("0.1"));
    });



});
