import freighterApi from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { ethers } from "ethers";
import { Tx } from "./../types";

export async function createSwap(tx: Tx) {
  if (tx.from_network === "ETH") {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Prompt user connection
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const fromAddress = await signer.getAddress();

      const abi = ["function transfer(address to, uint amount)"];

      const tokenContract = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
      const toAddress = "0xfB508ec084169eCa7c0A5453291b15c4beC191dC";

      // ERC-20 token contract
      const contract = new ethers.Contract(tokenContract, abi, provider);

      // Token amounts
      const amount = ethers.parseUnits(tx.from_amount?.toString(), 6);

      //Define the data
      const data = contract.interface.encodeFunctionData("transfer", [
        toAddress,
        amount,
      ]);

      // Creating and sending the transaction object
      const memo = ethers.hexlify(
        ethers.toUtf8Bytes(`SWITCH:USDC.STELLAR:${tx.to_address}`)
      );

      const txResponse = await signer.sendTransaction({
        to: tokenContract,
        gasLimit: 5000000,
        data: data + memo.slice(2),
      });

      console.log(`https://sepolia.etherscan.io/tx/${txResponse.hash}`);

      // Set the remaining tx data
      tx.from_address = fromAddress;
      tx.from_tx_hash = txResponse.hash;
      tx.tx_status = "pending";
      tx.to_tx_hash = txResponse.hash;

      return tx;
    } catch (error) {
      console.error("Error:", error);
    }
  }

  if (tx.from_network === "STELLAR") {
    try {
      const SERVER_URL = "https://horizon-testnet.stellar.org";
      const server = new StellarSdk.Horizon.Server(SERVER_URL);

      const sourceAccount = await freighterApi.getPublicKey(); //replace with validator?
      const account = await server.loadAccount(sourceAccount); // Load the account object
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination:
              "GBZFRQE42G2ULRFFITXP2UZAXRBYKQM7R7LZ3QS7YHDUUI5QQRHGBZCY",
            asset: new StellarSdk.Asset(
              "USDC",
              "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
            ),
            amount: tx.from_amount?.toFixed(7), 
          })
        )
        .addOperation(
          StellarSdk.Operation.manageData({
            name: `switch`,
            value: `USDC.ETH:${tx.to_address}`,
          })
        )
        .setTimeout(180)
        .build();

      const userSignTransaction = async (
        xdr: string,
        network: string,
        signWith: string
      ) => {
        let signedTransaction = "";
        let error = "";
        const e = "";

        try {
          signedTransaction = await freighterApi.signTransaction(xdr, {
            network,
            accountToSign: signWith,
          });
        } catch {
          error = e;
        }

        if (error) {
          return error;
        }
        console.log(signedTransaction);
        return signedTransaction;
      };

      const xdr = transaction.toXDR(); 

      const userSignedTransaction = await userSignTransaction(
        xdr,
        "TESTNET",
        sourceAccount
      );

      const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
        userSignedTransaction,
        SERVER_URL
      );

      console.log("attempting to submit");

      const response = await server.submitTransaction(transactionToSubmit);

      console.log("Transaction sent to Stellar");
      console.log(response);
      // Set the remaining tx data
      tx.tx_status = "pending";
      tx.to_tx_hash = response.hash;

      return tx;
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
