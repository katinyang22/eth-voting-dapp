// import CSS. Webpack with deal with it
import "../css/style.css"

// Import libraries we need.
import { default as Web3 } from "web3"
import { default as contract } from "truffle-contract"

// get build artifacts from compiled smart contract and create the truffle contract
import votingArtifacts from "../../build/contracts/Voting.json"
var VotingContract = contract(votingArtifacts)


/*
 * This holds all the functions for the app
 */
window.App = {
  web3Provider: null,
  contracts: {},
  account: null,

  init: async function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    let web3;
   if (typeof window.ethereum !== 'undefined') {
   web3 = new Web3(window.ethereum);
   window.ethereum.enable(); // request access
   } else {
   console.log('No Ethereum provider detected.');
   }

  },

  initContract: function () {
    App.contracts.Voting = VotingContract;
    App.contracts.Voting.setProvider(App.web3Provider);
    console.log("Voting contract initialized:", App.contracts.Voting);
  
    return App.render();
    console.log("Contract Voting initialized?", App.contracts.Voting);
  },
  
  render: function () {
    web3.eth.getCoinbase(function (err, account) {
      if (!err) {
        App.account = account;
      }
    });

    App.loadCandidates();
  },

  loadCandidates: function () {
    App.contracts.Voting.deployed().then(function (instance) {
      return instance.getNumOfCandidates();
    }).then(function (num) {
      $("#candidate-box").empty();

      for (let i = 0; i < num; i++) {
        App.contracts.Voting.deployed().then(function (instance) {
          return instance.getCandidateName(i);
        }).then(function (name) {
          const candidateName = web3.toAscii(name).replace(/\u0000/g, '');
          const checkbox = `<div class="form-check">
              <input class="form-check-input" type="radio" name="candidate" id="candidate${i}" value="${i}">
              <label class="form-check-label" for="candidate${i}">
                ${candidateName}
              </label>
            </div>`;
          $("#candidate-box").append(checkbox);
        });
      }
    });
  },

  vote: async function () {
    const userId = $("#id-input").val();
    const candidateIndex = $("input[name='candidate']:checked").val();

    if (!userId || candidateIndex === undefined) {
      $("#msg").html("<p class='text-danger'>Please enter your ID and select a candidate.</p>");
      return;
    }

    App.contracts.Voting.deployed().then(function (instance) {
      return instance.vote(userId, candidateIndex, { from: App.account });
    }).then(function (result) {
      $("#msg").html("<p class='text-success'>Vote cast successfully!</p>");
    }).catch(function (err) {
      console.error(err.message);
      $("#msg").html("<p class='text-danger'>Error submitting vote.</p>");
    });
  },

  findNumOfVotes: async function () {
    App.contracts.Voting.deployed().then(function (instance) {
      return instance.getNumOfCandidates();
    }).then(function (num) {
      $("#vote-box").empty();

      for (let i = 0; i < num; i++) {
        App.contracts.Voting.deployed().then(function (instance) {
          return Promise.all([
            instance.getCandidateName(i),
            instance.totalVotesFor(i)
          ]);
        }).then(function ([name, count]) {
          const candidateName = web3.toAscii(name).replace(/\u0000/g, '');
          const result = `<p>${candidateName}: ${count.toString()} vote(s)</p>`;
          $("#vote-box").append(result);
        });
      }
    });
  },

  registerVoter: function () {
    if (!App.contracts.Voting) {
      console.error("Voting contract not initialized.");
      return;
    }
  
    const user = App.account;
  
    App.contracts.Voting.deployed().then(function (instance) {
      return instance.registerVoter(user, { from: App.account });
    }).then(function () {
      $("#msg").html("<p class='text-success'>Successfully registered as a voter.</p>");
    }).catch(function (err) {
      console.error("Register Error: ", err.message);
      $("#msg").html("<p class='text-danger'>Error registering voter. You may already be registered.</p>");
    });
  },
  
  delegateVote: function () {
    const toAddress = $("#delegateAddress").val();

    if (!web3.isAddress(toAddress)) {
      $("#msg").html("<p class='text-danger'>Invalid Ethereum address.</p>");
      return;
    }

    App.contracts.Voting.deployed().then(function (instance) {
      return instance.delegate(toAddress, { from: App.account });
    }).then(function (result) {
      $("#msg").html("<p class='text-success'>Vote successfully delegated to " + toAddress + ".</p>");
    }).catch(function (err) {
      console.error("Delegate Error: ", err.message);
      $("#msg").html("<p class='text-danger'>Error delegating vote. You may have already voted or delegated.</p>");
    });
  }
};

if (typeof web3 !== 'undefined') {
  App.web3Provider = web3.currentProvider;
} else {
  App.web3Provider = new Web3.providers.HttpProvider("https://glowing-spork-r49rv6qv76935gwv-8545.app.github.dev/");
}
web3 = new Web3(App.web3Provider);



$(function () {
  App.init().then(() => {
    // Only bind after init
    $("#registerBtn").click(App.registerVoter);
    $("#voteBtn").click(App.vote);
    $("#delegateBtn").click(App.delegateVote);
  });
});


