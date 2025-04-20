import Web3 from "web3";
import votingArtifacts from "../../build/contracts/Voting.json";
import "../css/style.css";
import contract from "@truffle/contract";

let web3;
let VotingContract = contract(votingArtifacts);

window.App = {
  web3Provider: null,
  contracts: {},
  account: null,

  init: async function () {
    await App.initWeb3();
    await App.initContract();
    App.bindEvents();
    await App.loadCandidates();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        App.account = accounts[0];
        console.log("🦊 MetaMask connected:", App.account);
      } catch (err) {
        console.error("MetaMask connection rejected", err);
      }
    } else {
      console.error("🛑 No Ethereum provider found. Install MetaMask.");
    }
  },

  initContract: async function () {
    try {
      VotingContract.setProvider(App.web3Provider);
      App.contracts.Voting = await VotingContract.deployed();
      console.log("✅ Contract loaded at", App.contracts.Voting.address);
    } catch (err) {
      console.error("❌ Contract not deployed to current network:", err.message);
      $("#msg").html("<p class='text-danger'>Contract not deployed. Please check your network.</p>");
    }
  },

  bindEvents: function () {
    $("#registerButton").click(App.registerVoter);
    $("#voteBtn").click(App.vote);
    $("#delegateBtn").click(App.delegateVote);
    $("#countVotesBtn").click(App.findNumOfVotes);
  },

  loadCandidates: async function () {
    if (!App.contracts.Voting) return;
    try {
    const bnCount = await App.contracts.Voting.getNumOfCandidates();
    const count   = bnCount.toNumber();                          // convert BN → JS #
    console.log("🧾 Number of candidates:", count);
    $("#candidate-box").empty();

    for (let i = 0; i < count; i++) {
      const result = await App.contracts.Voting.getCandidate.call(i);
  
      const id    = result[0].toNumber();      
      const name  = result[1];                 
      const party = result[2];                 
    
      const html = `
        <div class="form-check">
          <input class="form-check-input" type="radio"
                 name="candidate" id="candidate${id}" value="${id}">
          <label class="form-check-label" for="candidate${id}">
            ${name} (${party})
          </label>
        </div>`;
      $("#candidate-box").append(html);
    }
    
    } catch (err) {
      console.error("⚠️  loadCandidates threw:", err);
      $("#candidate-box").html(
        `<pre class="text-danger">loadCandidates error:\n${err.message || err}</pre>`
      );
    }    
  },

  vote: async function () {
    const uid = $("#id-input").val();
    const candidateID = $("input[name='candidate']:checked").val();
  
    // ✅ Add these for debugging
    console.log("UID entered:", uid);
    console.log("Candidate selected:", candidateID);
  
    if (!uid || candidateID === undefined) {
      $("#msg").html("<p class='text-danger'>Please enter your Voter ID and select a candidate.</p>");
      return;
    }
  
    try {
      const instance = App.contracts.Voting;
      await instance.vote(candidateID, { from: App.account });
      $("#msg").html("<p class='text-success'>✅ Vote submitted successfully.</p>");
    } catch (err) {
      console.error("Vote Error:", err.message);
      $("#msg").html("<p class='text-danger'>❌ Error submitting vote.</p>");
    }
  },
  

  registerVoter: async function () {
    const uid = $("#uidInput").val().trim();
    if (!uid) {
    $("#msg").html("<p class='text-danger'>Please enter a UID first.</p>");
    return;
    }

    try {
      const instance = App.contracts.Voting;
      await instance.registerVoter(web3.utils.asciiToHex(uid), { from: App.account });
      $("#msg").html("<p class='text-success'>🎉 Registered successfully as a voter.</p>");
    } catch (err) {
      console.error("Register Error:", err.message);
      $("#msg").html("<p class='text-danger'>❌ Already registered or failed.</p>");
    }
  },

  delegateVote: async function () {
    const toAddress = $("#delegateAddress").val();
    if (!web3.utils.isAddress(toAddress)) {
      $("#msg").html("<p class='text-danger'>Invalid Ethereum address.</p>");
      return;
    }

    try {
      const instance = App.contracts.Voting;
      await instance.delegateVote(toAddress, { from: App.account });
      $("#msg").html(`<p class='text-success'>✅ Vote delegated to ${toAddress}</p>`);
    } catch (err) {
      console.error("Delegation Error:", err.message);
      $("#msg").html("<p class='text-danger'>❌ Delegation failed.</p>");
    }
  },
/*************************************************
 *  findNumOfVotes                               *
 *************************************************/
findNumOfVotes: async function () {
  try {
    const instance = App.contracts.Voting;

    /* 1️⃣  how many candidates?  */
    const countBN = await instance.getNumOfCandidates();
    const count   = countBN.toNumber();          // BN → plain number

    $("#vote-box").empty();

    /* 2️⃣  loop through each candidate */
    for (let i = 0; i < count; i++) {
      // getCandidate returns an object, not an array
      const c        = await instance.getCandidate.call(i);
      const idBN     = c[0];          // BN
      const name     = c[1];          // string
      const party    = c[2];          // string  (unused here)

      /*  total votes for this candidate  */
      const votesBN  = await instance.totalVotes.call(idBN);
      const votes    = votesBN.toString();

      /*  render one row  */
      const row = `<p><strong>${name}</strong>: ${votes} vote(s)</p>`;
      $("#vote-box").append(row);
    }
  } catch (err) {
    console.error("Vote count error:", err);
    $("#vote-box").html(
      `<pre class="text-danger">Count error:\n${err.message || err}</pre>`
    );
  }
},
 
};

$(function () {
  App.init().then(() => {
    $("#registerButton").click(App.registerVoter);
  });
});

