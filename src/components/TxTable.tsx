import { Tx } from "../types";
import txIcon from "../assets/tx.svg";

const TxTable = ({ transactions }: { transactions: Tx[] }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-400";
      case "swap":
        return "bg-green-400";
      case "failed swap":
        return "bg-red-400";
      case "liquidity added":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getExplorerLink = (to_network: string, to_tx_hash: string) => {
    switch (to_network) {
      case "ETH":
        return `https://sepolia.etherscan.io/tx/${to_tx_hash}`;
      case "STELLAR":
        return `https://testnet.stellarchain.io/transactions/${to_tx_hash}`;
      default:
        return null;
    }
  };

  return (
    <div className="max-h-80 overflow-y-auto rounded-md">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 ">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
          <tr>
            <th scope="col" className="px-6 py-3">
              Transaction
            </th>
            <th scope="col" className="px-6 py-3">
              Swap Fee
            </th>
            <th scope="col" className="px-6 py-3">
              Status
            </th>
            <th scope="col" className="px-6 py-3">
              Link
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr
              key={index}
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <td
                scope="row"
                className="flex items-center px-6 py-4 text-gray-900 whitespace-nowrap dark:text-white"
              >
                <img
                  className="w-10 h-10 rounded-full"
                  src={txIcon}
                  alt="Tx-Icon"
                />
                <div className="ps-3">
                  <div className="text-base font-semibold">
                    <span>{transaction.from_network}</span> &rarr;{" "}
                    <span>{transaction.to_network}</span>
                  </div>
                  <div className="font-normal text-gray-500">
                    <span>
                      {new Intl.NumberFormat("en-US", {}).format(
                        transaction.from_amount
                      )}{" "}
                      {transaction.from_asset_code}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">{`${transaction.tx_fee || 0} ${
                transaction.from_asset_code
              }`}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      transaction.tx_status ?? ""
                    )} mr-2`}
                  ></div>
                  <span className="font-normal">
                    {(transaction?.tx_status
                      ?.charAt(0)
                      ?.toUpperCase() as string) +
                      transaction?.tx_status?.slice(1)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <a
                  href={
                    transaction.tx_status !== "pending"
                      ? (getExplorerLink(
                          transaction?.to_network as string,
                          transaction?.to_tx_hash as string
                        ) as string)
                      : undefined
                  }
                  className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                  target="_blank" // Open link in new tab
                  rel="noopener noreferrer" // Recommended for security reasons
                >
                  Explorer
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TxTable;
