// src/js/init.js
import Web3 from "web3";
import contract from "@truffle/contract";
import artifacts from "../../build/contracts/Voting.json";

export const App = {
  web3Provider: null,
  account: null,
  contracts: {},
  async initWeb3() { /*…*/ },
  async initContract() { /*…*/ },
};

// bootstrap sequence
(async () => {
  await App.initWeb3();
  await App.initContract();
})();
