import { useEffect, useState } from "react";
import logo from "./assets/logo.svg";
import swapIcon from "./assets/swap.svg";
import InputBox from "./components/InputBox";
import ThemeToggle from "./components/ThemeToggle";
import TxTable from "./components/TxTable";
import useNetworkInfo from "./hooks/useNetworkInfo";
import useTransactions from "./hooks/useTransactions";
// import { createSwap } from "./services/tx";
// import { Tx } from "./types";

function App() {
  const [amount, setAmount] = useState(1);
  const [fromToken, setFromToken] = useState("USDC (Ethereum Sepolia)");
  const [toToken, setToToken] = useState("USDC (Stellar Testnet)");
  const [txFee, setTxFee] = useState(0);
  const [swapped, setSwapped] = useState(true);
  const [toAddreess, setToAddress] = useState("");
  const { transactions, handleCreateTransaction } = useTransactions();
  const networkInfo = useNetworkInfo();

  useEffect(() => {
    // Set txFee based on networkInfo when networkInfo changes
    if (networkInfo.status === "live") {
      const id =
        toToken === "USDC (Ethereum Sepolia)" ? "USDC.ETH" : "USDC.STELLAR";
      const token = networkInfo.tokens.find((token) => token["id"] === id);
      const fee = token ? token["txFee"] : 0;
      setTxFee(fee);
    }
  }, [networkInfo]); // Run this effect whenever networkInfo changes

  const swap = () => {
    swapped ? setSwapped(false) : setSwapped(true);
    setFromToken(toToken);
    setToToken(fromToken);
    // toToken == "USDC (Stellar Testnet)" ? setTxFee(5) : setTxFee(0);
  };

  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="min-h-screen min-w-96 flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <div className="absolute right-2 top-2">
            <ThemeToggle />
          </div>
          <a
            href="#"
            className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white"
          >
            <img
              src={logo}
              className="invert dark:invert-0"
              height="30"
              width="100"
            />
          </a>
          <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <form
                className="space-y-4 md:space-y-6"
                action="#"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await handleCreateTransaction(fromToken, amount, toToken, toAddreess);
                  } catch (error) {
                    console.error("Error creating transaction:", error);
                    // Handle error if transaction creation fails
                  }
                }}
              >
                <div>
                  <InputBox
                    label="You Send"
                    amount={amount}
                    selectCurrency={fromToken}
                    onAmountChange={(amount) => setAmount(amount)}
                  />
                </div>

                <div className="relative leading-none">
                  <div className="border-2 ml-auto -top-4 justify-self-end absolute right-0 border-grey-100 rounded-full bg-white text-white px-2 py-2 leading-none dark:bg-gray-700 dark:border-gray-800">
                    <button
                      type="button"
                      className={`${
                        swapped ? "" : "rotate-180"
                      } transition-all`}
                      onClick={swap}
                    >
                      <img
                        src={swapIcon}
                        className="dark:invert"
                        height="14"
                        width="14"
                      />
                    </button>
                  </div>
                </div>
                <div>
                  <InputBox
                    label="You Receive"
                    amount={amount * 0.999 - txFee}
                    selectCurrency={toToken}
                    amountDisable
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Receiving Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    placeholder={
                      toToken == "USDC (Stellar Testnet)"
                        ? "Stellar Address"
                        : "Ethereum Address"
                    }
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    onChange={(e) => setToAddress(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full text-white bg-slate-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                >
                  {toToken == "USDC (Stellar Testnet)"
                    ? "Connect Ethereum Wallet"
                    : "Connect Stellar Wallet"}
                </button>
              </form>
            </div>
          </div>

          <div className="transactions-list mt-8">
            <TxTable transactions={transactions} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
