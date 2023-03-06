const { getWeth, formattedAmount } = require("../scripts/getWeth");
const { getNamedAccounts, ethers } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");

const main = async () => {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);
  const wethTokenAddress = networkConfig[network.config.chainId].wethToken;

  //approve
  await approveErc20(wethTokenAddress, lendingPool.address, formattedAmount, deployer);
  // deposit
  console.log("Depositing...");
  await lendingPool.deposit(wethTokenAddress, formattedAmount, deployer, 0);
  console.log("Deposited!");

  let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer);
  const daiPrice = await getDaiPrice();
  const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString());
  const daiTokenAddress = networkConfig[network.config.chainId].daiToken;
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowUserData(lendingPool, deployer);
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
};

const repay = async (amount, daiAddress, lendingPool, account) => {
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Repaid!");
};

const borrowDai = async (daiAddress, lendingPool, amountDaiToBorrow, account) => {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account);
  await borrowTx.wait(1);
  console.log("You've borrowed!");
};

const getDaiPrice = async () => {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    networkConfig[network.config.chainId].daiEthPriceFeed
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
};

const getBorrowUserData = async (lendingPool, account) => {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
  return { totalDebtETH, availableBorrowsETH };
};

const getLendingPool = async (account) => {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
  return lendingPool;
};

const approveErc20 = async (erc20Address, spenderAddress, amountToSpend, account) => {
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
