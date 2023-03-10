const { getNamedAccounts, ethers } = require("hardhat");

const AMOUNT = "0.02";
const formattedAmount = ethers.utils.parseEther(AMOUNT);

const getWeth = async () => {
  const { deployer } = await getNamedAccounts();
  //0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 mainnet addr
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  );
  const tx = await iWeth.deposit({ value: formattedAmount });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Wrapped ${AMOUNT} ETH to ${ethers.utils.formatEther(wethBalance)} WETH`);
};

module.exports = { getWeth, formattedAmount };
