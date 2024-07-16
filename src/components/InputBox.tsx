import {useId} from "react";

function InputBox({
                      label,
                      amount,
                      onAmountChange,
                      onCurrencyChange,
                      currencyOptions = ["USDC (Stellar Testnet)", "USDC (Ethereum Sepolia)"],
                      selectCurrency = "usd",
                      amountDisable = false,
                  }) {
    const amountInputId = useId();

    return (
        <div className='flex'>
            <div className="w-1/3">
                <label
                    htmlFor={amountInputId}
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    {label}
                </label>
                <input
                    id={amountInputId}
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Amount"
                    disabled={amountDisable}
                    value={amount}
                    onChange={(e) =>
                        onAmountChange && onAmountChange(Number(e.target.value))
                    }
                />
            </div>
            <div className="w-2/3 ml-2 flex flex-wrap justify-end text-right">
                <label
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    &nbsp;
                </label>
                <select
                    disabled
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    value={selectCurrency}
                    onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value)}
                >
                    {currencyOptions.map((currency) => (
                        <option key={currency} value={currency}>
                            {currency}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

InputBox.defaultProps = {
    label: "input",
    amount: 0,
    onAmountChange: '',
    onCurrencyChange: '',

}


export default InputBox;