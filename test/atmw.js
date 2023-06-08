// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const {
    time, impersonateAccount, mine
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;
const { toNum, toBN } = require("./utils/bignumberConverter");
const parse = require('csv-parse');

const BASE_CZUSD_LP_WAD = parseEther("7593.85");
const INITIAL_CZUSD_LP_WAD = parseEther("11334.10");
const INITIAL_SUPPLY = parseEther("210000000");;
const INITIAL_ATMW_LP_WAD = parseEther("140700000");
const CZUSD_TOKEN = "0xE68b79e51bf826534Ff37AA9CeE71a3842ee9c70";
const WBNB_TOKEN = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BTCB_TOKEN = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const PCS_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const PCS_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const DEPLOYER = "0x70e1cB759996a1527eD1801B169621C18a9f38F9";
const TREASURY = "0x745A676C5c472b50B50e18D4b59e9AeEEc597046";


describe("ATMW", function () {
    let owner, manager, trader, trader1, trader2, trader3, feeDistributor, treasury;
    let deployer;
    let atmw, czusd, wbnb, pcsRouter, atmwCzusdPair, autoRewardPool;
    before(async function () {
        console.log("getSigners...")
        const signers = await ethers.getSigners();
        await delay(3000);
        [owner, manager, trader, trader1, trader2, trader3, feeDistributor] = signers;
        console.log("impersonating...")
        await impersonateAccount(DEPLOYER);
        deployer = await ethers.getSigner(DEPLOYER);
        await impersonateAccount(TREASURY);
        treasury = await ethers.getSigner(TREASURY);

        console.log("getContractAt...")

        pcsRouter = await ethers.getContractAt("IAmmRouter02", PCS_ROUTER);
        czusd = await ethers.getContractAt("CZUsd", CZUSD_TOKEN);
        wbnb = await ethers.getContractAt("IERC20", WBNB_TOKEN);

        console.log("deploying autorewardpool")

        const AutoRewardPool = await ethers.getContractFactory("AutoRewardPool");
        autoRewardPool = await AutoRewardPool.deploy();

        console.log("deploying Atmw")
        const Atmw = await ethers.getContractFactory("ATMW");
        atmw = await Atmw.deploy(
            CZUSD_TOKEN,
            PCS_ROUTER,
            PCS_FACTORY,
            autoRewardPool.address,
            BASE_CZUSD_LP_WAD,
            INITIAL_SUPPLY,
            manager.address
        );

        console.log("getting ammCzusdPair")
        const atmwCzusdPair_address = await atmw.ammCzusdPair();
        atmwCzusdPair = await ethers.getContractAt("IAmmPair", atmwCzusdPair_address);

        console.log("initialize autoRewardPool")
        autoRewardPool.initialize(atmw.address, atmwCzusdPair.address);

        await owner.sendTransaction({
            to: treasury.address,
            value: parseEther("0.2")
        })

        await czusd.connect(treasury).mint(owner.address, parseEther("100000"));
        await atmw.approve(pcsRouter.address, ethers.constants.MaxUint256);
        await czusd.approve(pcsRouter.address, ethers.constants.MaxUint256);
        console.log("add liq")
        await pcsRouter.addLiquidity(
            czusd.address,
            atmw.address,
            INITIAL_CZUSD_LP_WAD,
            INITIAL_ATMW_LP_WAD,
            0,
            0,
            atmw.address,
            ethers.constants.MaxUint256
        );
    });
    it("Should deploy atmw", async function () {
        const pairCzusdBal = await czusd.balanceOf(atmwCzusdPair.address);
        const pairAtmwal = await atmw.balanceOf(atmwCzusdPair.address);
        const baseCzusdLocked = await atmw.baseCzusdLocked();
        const totalCzusdSpent = await atmw.totalCzusdSpent();
        const ownerIsExempt = await atmw.isExempt(owner.address);
        const pairIsExempt = await atmw.isExempt(atmwCzusdPair.address);
        const tradingOpen = await atmw.tradingOpen();
        expect(pairCzusdBal).to.eq(INITIAL_CZUSD_LP_WAD);
        expect(pairAtmwal).to.eq(INITIAL_ATMW_LP_WAD);
        expect(baseCzusdLocked).to.eq(BASE_CZUSD_LP_WAD);
        expect(totalCzusdSpent).to.eq(0);
        expect(ownerIsExempt).to.be.true;
        expect(pairIsExempt).to.be.false;
        expect(tradingOpen).to.be.false;
    });
    it("Should revert buy when trading not open", async function () {
        await czusd.connect(treasury).mint(trader.address, parseEther("10000"));
        await czusd.connect(trader).approve(pcsRouter.address, ethers.constants.MaxUint256);

        await expect(pcsRouter.connect(trader).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            parseEther("100"),
            0,
            [czusd.address, atmw.address],
            trader.address,
            ethers.constants.MaxUint256
        )).to.be.reverted;
    });
    it("Should burn 7% when buying and increase wad available", async function () {
        await atmw.ADMIN_openTrading();
        const totalStakedInitial = await autoRewardPool.totalStaked();
        const traderBalInitial = await atmw.balanceOf(trader.address);
        console.log("attempting swap...")
        await pcsRouter.connect(trader).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            parseEther("100"),
            0,
            [czusd.address, atmw.address],
            trader.address,
            ethers.constants.MaxUint256
        );
        console.log("swap success.")
        const pendingReward = await autoRewardPool.pendingReward(trader.address);
        const rewardPerSecond = await autoRewardPool.rewardPerSecond();
        const totalStakedFinal = await autoRewardPool.totalStaked();
        const totalCzusdSpent = await atmw.totalCzusdSpent();
        const lockedCzusd = await atmw.lockedCzusd();
        const availableWadToSend = await atmw.availableWadToSend();
        const totalSupply = await atmw.totalSupply();
        const traderBalFinal = await atmw.balanceOf(trader.address);
        expect(pendingReward).to.eq(0);
        expect(totalStakedFinal.sub(totalStakedInitial)).to.eq(traderBalFinal.sub(traderBalInitial));
        expect(totalStakedInitial).to.eq(0);
        expect(rewardPerSecond).to.eq(0);
        expect(totalCzusdSpent).to.eq(0);
        expect(lockedCzusd).to.be.closeTo(parseEther("7602.2"), parseEther("0.1"));
        expect(availableWadToSend).to.eq(lockedCzusd.sub(BASE_CZUSD_LP_WAD).sub(totalCzusdSpent));
        expect(totalSupply).to.be.closeTo(parseEther("209914076"), parseEther("1"));
    });
    it("Should send reward to dev wallet", async function () {
        const devWalletBalInitial = await atmw.balanceOf(manager.address);
        const autoRewardPoolBalInitial = await atmw.balanceOf(autoRewardPool.address);
        const availableWadToSendInitial = await atmw.availableWadToSend();
        await czusd.transfer(atmw.address, parseEther("25000"));
        await atmw.performUpkeep(0);
        const devWalletBalFinal = await atmw.balanceOf(manager.address);
        const autoRewardPoolBalFinal = await atmw.balanceOf(autoRewardPool.address);
        const availableWadToSendFinal = await atmw.availableWadToSend();
        const totalCzusdSpent = await atmw.totalCzusdSpent();
        const traderBal = await atmw.balanceOf(trader.address);
        await atmw.connect(trader).transfer(trader1.address, traderBal);
        const trader1Bal = await atmw.balanceOf(trader1.address);
        await atmw.connect(trader1).transfer(trader.address, trader1Bal);
        const rewardPerSecond = await autoRewardPool.rewardPerSecond();

        expect(totalCzusdSpent).to.eq(availableWadToSendInitial);
        expect(totalCzusdSpent).to.be.closeTo(parseEther("8.3"), parseEther("0.1"));
        expect(availableWadToSendFinal).to.eq(0);
        //btcbcoin has 8 decimals, divide 18 decimals by 10*10 to get 8.
        expect(devWalletBalFinal.sub(devWalletBalInitial)).closeTo(parseEther("0.000166"), parseEther("0.000001"));
        expect(autoRewardPoolBalFinal.sub(autoRewardPoolBalInitial)).closeTo(parseEther("0.000124"), parseEther("000001"));
        expect(autoRewardPoolBalFinal.sub(autoRewardPoolBalInitial).div(86400 * 7)).to.be.eq(rewardPerSecond);
        expect(rewardPerSecond).to.be.closeTo(206124881, 100000);

    });
    it("Should properly set rps on second update", async function () {
        await time.increase(1 * 86400);
        await mine(1);
        const autoRewardPoolBalInitial = await atmw.balanceOf(autoRewardPool.address);
        await atmw.performUpkeep(0);
        await time.increase(10);
        await mine(1);
        const autoRewardPoolBalFinal = await atmw.balanceOf(autoRewardPool.address);
        const traderBal = await atmw.balanceOf(trader.address);
        await atmw.connect(trader).transfer(trader1.address, traderBal);
        const trader1Bal = await atmw.balanceOf(trader1.address);
        await atmw.connect(trader1).transfer(trader.address, trader1Bal);
        const rewardPerSecond = await autoRewardPool.rewardPerSecond();
        const totalRewardsPaid = await autoRewardPool.totalRewardsPaid();
        const traderRewardsReceived = await autoRewardPool.totalRewardsReceived(trader.address);
        const traderRewardBal = await atmw.balanceOf(trader.address);
        const trader1RewardsReceived = await autoRewardPool.totalRewardsReceived(trader1.address);
        const trader1RewardBal = await atmw.balanceOf(trader1.address);
        const autoRewardPoolBalPostRewards = await atmw.balanceOf(autoRewardPool.address);
        const timestampEnd = await autoRewardPool.timestampEnd();
        const currentTime = await time.latest();
        const traderPending = await autoRewardPool.pendingReward(trader.address);
        const trader1Pending = await autoRewardPool.pendingReward(trader1.address);

        console.log('traderRewardBal', formatEther(traderRewardBal));
        console.log('trader1RewardBal', formatEther(trader1RewardBal));
        console.log('autoRewardPoolBalFinal.sub(autoRewardPoolBalInitial))', formatEther(autoRewardPoolBalFinal.sub(autoRewardPoolBalInitial)));
        console.log('rewardPerSecond', rewardPerSecond);

        expect(traderPending).to.eq(0);
        expect(trader1Pending).to.eq(0);
        expect(traderRewardBal).closeTo(parseEther("0.0000177"), parseEther("0.0000001"));
        expect(trader1RewardBal).to.eq(0)
        expect(traderRewardsReceived).to.eq(traderRewardBal);
        expect(trader1RewardsReceived).to.eq(trader1RewardBal);
        expect(totalRewardsPaid).to.eq(traderRewardBal.add(trader1RewardBal))
        expect(autoRewardPoolBalFinal.sub(autoRewardPoolBalInitial)).closeTo(parseEther("0.0000830"), parseEther("0.0000001"));
        expect(rewardPerSecond).to.be.closeTo(314088122, 100000);
        expect(rewardPerSecond.mul(timestampEnd.sub(currentTime))).closeTo(autoRewardPoolBalPostRewards, 10000000);
    });
    it("Should properly set pending rewards with third trader and third update", async function () {
        await czusd.connect(treasury).mint(trader2.address, parseEther("10000"));
        await czusd.connect(trader2).approve(pcsRouter.address, ethers.constants.MaxUint256);
        await pcsRouter.connect(trader2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            parseEther("100"),
            0,
            [czusd.address, atmw.address],
            trader2.address,
            ethers.constants.MaxUint256
        );
        const currentTimeInitial = await time.latest();
        await time.increase(1 * 86400);
        await mine(1);
        const currentTimeMiddle = await time.latest();
        const autoRewardPoolBalInitial = await atmw.balanceOf(autoRewardPool.address);
        await atmw.performUpkeep(0);
        const autoRewardPoolBalFinal = await atmw.balanceOf(autoRewardPool.address);
        const traderBal = await atmw.balanceOf(trader.address);
        await atmw.connect(trader).transfer(trader1.address, traderBal);
        const trader1Bal = await atmw.balanceOf(trader1.address);
        await atmw.connect(trader1).transfer(trader.address, trader1Bal);
        const rewardPerSecond = await autoRewardPool.rewardPerSecond();
        const totalRewardsPaid = await autoRewardPool.totalRewardsPaid();
        const autoRewardPoolBalPostRewards = await atmw.balanceOf(autoRewardPool.address);
        const currentTimeFinal = await time.latest();
        const timestampEnd = await autoRewardPool.timestampEnd();
        const traderPending = await autoRewardPool.pendingReward(trader.address);
        const trader1Pending = await autoRewardPool.pendingReward(trader1.address);
        const trader2Pending = await autoRewardPool.pendingReward(trader2.address);

        console.log('rewardPerSecond', rewardPerSecond);
        console.log('trader2Pending', formatEther(trader2Pending));

        expect(rewardPerSecond).to.be.closeTo(472093954, 100000);
        expect(traderPending).to.eq(0);
        expect(trader1Pending).to.eq(0);
        expect(trader2Pending).closeTo(parseEther("0.00001458"), parseEther("0.00000001"));
        expect(rewardPerSecond.mul(timestampEnd.sub(currentTimeFinal))).closeTo(autoRewardPoolBalPostRewards.sub(trader2Pending), 10000000);
    });
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}