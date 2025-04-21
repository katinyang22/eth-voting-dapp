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
    App.subscribeToVoteEvents();
    setInterval(() => {
      console.log("⏱️ Polling for latest vote counts…");
      App.findNumOfVotes();
    }, 5000);
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
  
      try {
        // Request accounts and save the first as the "current" account
        const allAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        App.account = allAccounts[0];
        console.log("🦊 MetaMask connected:", App.account);
  
        // Populate delegation dropdown
        $("#delegateSelect").empty().append(
          `<option value="" disabled selected>Choose account…</option>`
        );
        allAccounts.forEach(acc => {
          if (acc.toLowerCase() !== App.account.toLowerCase()) {
            $("#delegateSelect").append(
              `<option value="${acc}">${acc}</option>`
            );
          }
        });
  
      } catch (err) {
        console.error("MetaMask connection rejected", err);
        $("#msg")
          .removeClass("text-success text-warning")
          .addClass("text-danger")
          .html("❌ Unable to connect to MetaMask");
      }
  
    } else {
      console.error("🛑 No Ethereum provider found. Install MetaMask.");
      $("#msg")
        .removeClass("text-success text-warning")
        .addClass("text-danger")
        .html("🛑 No Ethereum provider found. Please install MetaMask.");
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

  

  subscribeToVoteEvents: function () {
    const web3Contract = new web3.eth.Contract(
      VotingContract.abi,
      App.contracts.Voting.address
    );

    web3Contract.events
      .VoteCast({ fromBlock: "latest" })
      .on("data", (ev) => {
        console.log("🔔 VoteCast event:", ev.returnValues);
        App.findNumOfVotes();
      })
      .on("error", (err) => {
        console.error("VoteCast subscription error:", err);
      });
  },

  vote: async function () {
    const candID = $("input[name='candidate']:checked").val();
    if (candID === undefined) {
      return $("#msg").html("<p class='text-danger'>Please select a candidate.</p>");
    }

    try {
      await App.contracts.Voting.vote(candID, { from: App.account });
      $("#msg")
        .removeClass("text-danger")
        .addClass("text-success")
        .html("✅ Your vote has been cast.");
      // No need to manually call findNumOfVotes(), the event listener will fire.
    } catch (err) {
      console.error("Vote Error:", err);
      const reason = err.data?.reason || err.message;
      $("#msg")
        .removeClass("text-success")
        .addClass("text-danger")
        .html("❌ Vote failed: " + reason);
    }
  },

  registerVoter: async function () {
    const uid = $("#registration-id-input").val().trim();
    if (!uid) {
      return $("#msg").html(
        "<p class='text-danger'>Please enter a UID to register.</p>"
      );
    }
  
    try {
      const instance = App.contracts.Voting;
      const uidHex   = web3.utils.asciiToHex(uid);
      await instance.registerVoter(uidHex, { from: App.account });
  
      $("#msg")
        .removeClass("text-danger text-warning")
        .addClass("text-success")
        .html("🎉 Registered successfully!");
    } catch (err) {
      // Grab the solidity revert message if present
      const reason =
        err.data?.reason ||
        (err.data && Object.values(err.data)[0]?.reason) ||
        err.message;
  
      console.error("Register Error reason:", reason);
  
      if (reason.includes("UID already registered")) {
        $("#msg")
          .removeClass("text-success text-danger")
          .addClass("text-warning")
          .html("⚠️ That UID is already taken. Please choose another.");
      } else if (reason.includes("Address already registered")) {
        $("#msg")
          .removeClass("text-success text-warning")
          .addClass("text-warning")
          .html("⚠️ This wallet is already registered. Switch accounts or reset the chain.");
      } else {
        $("#msg")
          .removeClass("text-success text-warning")
          .addClass("text-danger")
          .html("❌ Registration failed: " + reason);
      }
    }
  },  

  
  delegateVote: async function () {
    const to = $("#delegateSelect").val();
    if (!to) {
      return $("#msg").html("<p class='text-danger'>Please choose an account</p>");
    }
  
    try {
      await App.contracts.Voting.delegateVote(to, { from: App.account });
      $("#msg").html(`<p class='text-success'>✅ Vote delegated to ${to}</p>`);
    } catch (err) {
      const reason = err.data?.reason || err.message;
      console.error("Delegation Error:", err);
      if (reason.includes("Not registered")) {
        $("#msg").html(
          "<p class='text-warning'>⚠️ You must register as a voter before you can delegate.</p>"
        );
      } else {
        $("#msg").html(
          `<p class='text-danger'>❌ Delegation failed: ${reason}</p>`
        );
      }
    }
  },  

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

