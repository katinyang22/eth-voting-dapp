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
    await App.checkRegistration();      // <-- new check
    await App.loadCandidates();
    App.subscribeToVoteEvents();
    setInterval(() => App.findNumOfVotes(), 10000); // polling fallback
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
      try {
        const allAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        App.account = allAccounts[0];
        console.log("🦊 MetaMask connected:", App.account);
        // populate delegation dropdown once registered
        $("#delegateSelect").empty().append(
          `<option value="" disabled selected>Select delegate...</option>`
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
        $("#msg").addClass("text-danger").html("❌ Unable to connect MetaMask");
      }
    } else {
      console.error("No Ethereum provider found");
      $("#msg").addClass("text-danger").html("🛑 Install MetaMask");
    }
  },

  initContract: async function () {
    try {
      VotingContract.setProvider(App.web3Provider);
      App.contracts.Voting = await VotingContract.deployed();
      console.log("✅ Contract at", App.contracts.Voting.address);
    } catch (err) {
      console.error("Contract mismatch:", err.message);
      $("#msg").addClass("text-danger").html("❌ Contract not on this network");
    }
  },

  bindEvents: function () {
    $("#registerButton").click(App.registerVoter);
    $("#voteBtn").click(App.vote);
    $("#delegateBtn").click(App.delegateVote);
    $("#countVotesBtn").click(App.findNumOfVotes);
  },

  checkRegistration: async function() {
    // Show register or voting sections based on on-chain status
    if (!App.contracts.Voting) return;
    try {
      await App.contracts.Voting.getVoterInfo(App.account);
      // already registered -> show voting
      $('#registration-section').hide();
      $('#voting-section,#delegation-section,#results-section').show();
    } catch {
      // not registered -> show only register
      $('#registration-section').show();
      $('#voting-section,#delegation-section,#results-section').hide();
    }
  },

  loadCandidates: async function () {
    if (!App.contracts.Voting) return;
    try {
      const instance = App.contracts.Voting;
      const countBN  = await instance.getNumOfCandidates();
      const count    = countBN.toNumber();
  
      $("#candidate-box").empty();
      for (let i = 0; i < count; i++) {
        // call() or direct call—you can omit .call() in Truffle v5+
        const result = await instance.getCandidate(i);
        // result is an object with numeric keys 0,1,2
        const id    = result[0].toNumber();
        const name  = result[1];
        const party = result[2];
  
        const html = `
          <div class="form-check">
            <input class="form-check-input"
                   type="radio"
                   name="candidate"
                   id="candidate${id}"
                   value="${id}">
            <label class="form-check-label" for="candidate${id}">
              ${name} (${party})
            </label>
          </div>`;
        $("#candidate-box").append(html);
      }
    } catch (err) {
      console.error("⚠️ loadCandidates threw:", err);
      $("#candidate-box").html(
        `<pre class="text-danger">loadCandidates error:\n${err.message}</pre>`
      );
    }
  },
  

  subscribeToVoteEvents: function () {
    const web3c = new web3.eth.Contract(VotingContract.abi, App.contracts.Voting.address);
    web3c.events.VoteCast({fromBlock:'latest'})
      .on('data',()=>App.findNumOfVotes())
      .on('error',e=>console.error(e));
  },

  registerVoter: async function () {
    const uid = $('#registration-id-input').val().trim();
    if(!uid) return $('#msg').addClass('text-danger').text('Enter a UID');
    try {
      await App.contracts.Voting.registerVoter(web3.utils.asciiToHex(uid), {from: App.account});
      $('#msg').removeClass('text-danger').addClass('text-success').text('Registered!');
      await App.checkRegistration();
    } catch(err) {
      console.error('Reg err',err);
      const reason = err.data?.reason||err.message;
      $('#msg').addClass('text-danger').text(reason);
    }
  },

  vote: async function(){
    const id = $('input[name=candidate]:checked').val();
    if(id===undefined) return $('#msg').addClass('text-danger').text('Select a candidate');
    try{
      await App.contracts.Voting.vote(id,{from:App.account});
      $('#msg').removeClass('text-danger').addClass('text-success').text('Vote cast');
    }catch(e){ console.error(e); $('#msg').addClass('text-danger').text(e.data?.reason||e.message);}  
  },

  delegateVote: async function(){
    const to = $('#delegateSelect').val();
    if(!to) return $('#msg').addClass('text-danger').text('Select delegate');
    try{
      await App.contracts.Voting.delegateVote(to,{from:App.account});
      $('#msg').removeClass('text-danger').addClass('text-success').text('Delegated');
    }catch(e){ console.error(e); $('#msg').addClass('text-danger').text(e.data?.reason||e.message);}  
  },

  findNumOfVotes: async function () {
    try {
      const instance = App.contracts.Voting;
      const countBN  = await instance.getNumOfCandidates();
      const count    = countBN.toNumber();
  
      $("#vote-box").empty();
      for (let i = 0; i < count; i++) {
        const candidate  = await instance.getCandidate(i);
        const id         = candidate[0].toNumber();
        const name       = candidate[1];
        const votesBN    = await instance.totalVotes(id);
        const votes      = votesBN.toString();
  
        $("#vote-box").append(
          `<p><strong>${name}</strong>: ${votes} vote(s)</p>`
        );
      }
    } catch (err) {
      console.error("Vote count error:", err);
      $("#vote-box").html(
        `<pre class="text-danger">Count error:\n${err.message}</pre>`
      );
    }
  },
  
};

$(App.init);
