import Web3 from "web3";
import votingArtifacts from "../../build/contracts/Voting.json";
import "../cs/style.css";
import contract from "@truffle/contract";

let web3;
const VotingContract = contract(votingArtifacts);

window.App = {
  web3Provider: null,
  contracts: {},
  account: null,

  // helper to show exactly one section by its ID
  showSection(sectionId) {
    ['register','delegate','vote','results'].forEach(id => {
      $('#' + id).toggle(id === sectionId);
    });
    // back button only when not on register
    $('#backButton').toggle(sectionId !== 'register');
    // update nav‐link active class
    $('.nav-link').removeClass('active');
    $(`.nav-link[href="#${sectionId}"]`).addClass('active');
  },

  init: async function () {
    await App.initWeb3();
    await App.initContract();
    App.bindEvents();
    await App.checkRegistration();
    await App.loadCandidates();
    App.subscribeToVoteEvents();
  },

  bindEvents: function () {
    $('#registerButton') .click(App.registerVoter);
    $('#delegateBtn')     .click(App.delegateVote);
    $('#voteBtn')         .click(App.vote);
    $('#countVotesBtn')   .click(App.findNumOfVotes);
    $('#backButton')      .click(() => App.showSection('register'));
    // nav links
    $('.nav-link').click(function(e) {
      e.preventDefault();
      const target = $(this).attr('href').slice(1);
      App.showSection(target);
    });
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
      try {
        const [first] = await window.ethereum.request({ method: "eth_requestAccounts" });
        App.account = first;
        console.log("🦊 MetaMask connected:", App.account);

        // populate delegation dropdown
        const all = await web3.eth.getAccounts();
        $('#delegateSelect').empty()
          .append(`<option value="" disabled selected>Select delegate…</option>`);
        all.forEach(a => {
          if (a.toLowerCase() !== App.account.toLowerCase()) {
            $('#delegateSelect').append(`<option>${a}</option>`);
          }
        });
      } catch (err) {
        console.error("MetaMask connect rejected", err);
        $('#msg').text("❌ Unable to connect MetaMask");
      }
    } else {
      $('#msg').text("🛑 No Ethereum provider found. Install MetaMask.");
      console.error("No Ethereum provider");
    }
  },

  initContract: async function () {
    try {
      VotingContract.setProvider(App.web3Provider);
      App.contracts.Voting = await VotingContract.deployed();
      console.log("✅ Contract at", App.contracts.Voting.address);
    } catch (err) {
      $('#msg').text("❌ Contract not on this network");
      console.error("Contract mismatch:", err.message);
    }
  },

  checkRegistration: async function() {
    if (!App.contracts.Voting) return;
    try {
      // will revert if not registered
      await App.contracts.Voting.getVoterInfo(App.account);
      // registered → show voting by default
      $('#register').hide();
    $('#delegate, #vote, #results').removeClass('d-none');
    } catch {
      // not registered → show registration
      $('#register').show();
    $('#delegate, #vote, #results').addClass('d-none');
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
        // `getCandidate(i)` returns an object, not an array
        const candidate = await instance.getCandidate(i);
  
        // pull out the three fields by their numeric keys
        const id    = candidate[0].toNumber();
        const name  = candidate[1];
        const party = candidate[2];
  
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
      console.error("⚠️  loadCandidates threw:", err);
      $("#candidate-box").html(
        `<pre class="text-danger">loadCandidates error:\n${err.message}</pre>`
      );
    }
  },
  

  subscribeToVoteEvents: function () {
    const w3c = new web3.eth.Contract(
      VotingContract.abi,
      App.contracts.Voting.address
    );
    w3c.events.VoteCast({ fromBlock:'latest' })
      .on('data', () => App.findNumOfVotes())
      .on('error', e=>console.error("Event error",e));
  },

  registerVoter: async function () {
    const uid = $('#registration-id-input').val().trim();
    if (!uid) return $('#msg').text('Enter a UID');
    try {
      const hex = web3.utils.asciiToHex(uid);
      await App.contracts.Voting.registerVoter(hex,{ from:App.account });
      $('#msg').text('🎉 Registered!');
      await App.checkRegistration();
    } catch (e) {
      console.error("Reg error",e);
      $('#msg').text(e.data?.reason||e.message);
    }
  },

  vote: async function() {
    const id = $('input[name=candidate]:checked').val();
    if (id == null) return $('#msg').text('Select a candidate');
    try {
      await App.contracts.Voting.vote(id, { from: App.account });
      $('#msg').text('✅ Vote cast');
    } catch(e) {
      console.error("Vote err",e);
      $('#msg').text(e.data?.reason||e.message);
    }
  },

  delegateVote: async function() {
    const to = $('#delegateSelect').val();
    if (!to) return $('#msg').text('Select a delegate');
    try {
      await App.contracts.Voting.delegateVote(to,{ from: App.account });
      $('#msg').text('✅ Delegated');
    } catch (e) {
      console.error("Deleg err",e);
      $('#msg').text(e.data?.reason||e.message);
    }
  },

  findNumOfVotes: async function () {
    if (!App.contracts.Voting) return;
  
    try {
      const instance = App.contracts.Voting;
      const countBN  = await instance.getNumOfCandidates();
      const count    = countBN.toNumber();
  
      $("#vote-box").empty();
  
      for (let i = 0; i < count; i++) {
        const candidate = await instance.getCandidate(i);
        const id        = candidate[0].toNumber();
        const name      = candidate[1];
        const votesBN   = await instance.totalVotes(id);
        const votes     = votesBN.toString();
  
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
