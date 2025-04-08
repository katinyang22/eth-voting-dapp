// import CSS. Webpack will deal with it.
import "../css/style.css"

// Import libraries we need.
import { default as Web3 } from "web3"
import { default as contract } from "truffle-contract"

// get build artifacts from compiled smart contract and create the truffle contract
import votingArtifacts from "../../build/contracts/Voting.json"
var VotingContract = contract(votingArtifacts)
window.web3 = new Web3(
  new Web3.providers.HttpProvider("http://127.0.0.1:8080/api")
);

/*
 * This holds all the functions for the app.
 */
window.App = {
  // called when web3 is set up
  start: function() { 
    // setting up contract providers and transaction defaults for ALL contract instances
    VotingContract.setProvider(window.web3.currentProvider)
    VotingContract.defaults({ from: window.web3.eth.accounts[0], gas: 6721975 })

    // creates a VotingContract instance
    VotingContract.deployed().then(function(instance){
      instance.getNumOfCandidates().then(function(numOfCandidates){
        // If there are no candidates, add default ones.
        if (numOfCandidates == 0){
          instance.addCandidate("Candidate1", "Labour").then(function(result){ 
            $("#candidate-box").append(`<div class='form-check'><input class='form-check-input' type='checkbox' value='' id=${result.logs[0].args.candidateID}><label class='form-check-label' for=0>Candidate1</label></div>`)
          }).catch(function(err) {
            console.error("addCandidate1 error:", err.message);
          });
          instance.addCandidate("Candidate2", "Conservative").then(function(result){
            $("#candidate-box").append(`<div class='form-check'><input class='form-check-input' type='checkbox' value='' id=${result.logs[0].args.candidateID}><label class='form-check-label' for=1>Candidate2</label></div>`)
          }).catch(function(err) {
            console.error("addCandidate1 error:", err.message);
          });
          // update numOfCandidates
          numOfCandidates = 2 
        }
        else { 
          // Loop through candidates and display them.
          for (var i = 0; i < numOfCandidates; i++ ){
            instance.getCandidate(i).then(function(data){
              $("#candidate-box").append(`<div class="form-check"><input class="form-check-input" type="checkbox" value="" id=${data[0]}><label class="form-check-label" for=${data[0]}>${window.web3.toAscii(data[1])}</label></div>`)
            })
          }
        }
        window.numOfCandidates = numOfCandidates 
      })
    }).catch(function(err) {
      console.error("getNumOfCandidates error:", err.message);
    });
  },

  // Function that is called when user clicks the "vote" button
  vote: function() {
    var uid = $("#id-input").val() //getting user inputted id

    if (uid == ""){
      $("#msg").html("<p>Please enter id.</p>")
      return
    }
    // Check whether a candidate is selected.
    if ($("#candidate-box :checkbox:checked").length > 0){ 
      var candidateID = $("#candidate-box :checkbox:checked")[0].id
    } 
    else {
      $("#msg").html("<p>Please vote for a candidate.</p>")
      return
    }
    // Cast the vote.
    VotingContract.deployed().then(function(instance){
      instance.vote(uid, parseInt(candidateID)).then(function(result){
        $("#msg").html("<p>Voted</p>")
      })
    }).catch(function(err){ 
      console.error("ERROR! " + err.message)
    })
  },

  // Function called when the "Count Votes" button is clicked
  findNumOfVotes: function() {
    VotingContract.deployed().then(function(instance){
      var box = $("<section></section>") 
      // Loop through candidates and display their vote counts.
      for (var i = 0; i < window.numOfCandidates; i++){
        var candidatePromise = instance.getCandidate(i)
        var votesPromise = instance.totalVotes(i)
        Promise.all([candidatePromise, votesPromise]).then(function(data){
          box.append(`<p>${window.web3.toAscii(data[0][1])}: ${data[1]}</p>`)
        }).catch(function(err){ 
          console.error("ERROR! " + err.message)
        })
      }
      $("#vote-box").html(box)
    })
  },

  // New Feature: Voter Registration
  registerVoter: function() {
    VotingContract.deployed().then(function(instance) {
      return instance.registerVoter({ from: window.web3.eth.accounts[0] })
    }).then(function(result) {
      $("#msg").html("<p>Registration successful.</p>")
      console.log("Registration successful:", result)
    }).catch(function(err) {
      console.error("Registration error:", err.message)
      $("#msg").html("<p>Registration failed: " + err.message + "</p>")
    })
  },

  // New Feature: Vote Delegation
  delegateVote: function(delegateAddress) {
    VotingContract.deployed().then(function(instance) {
      return instance.delegateVote(delegateAddress, { from: window.web3.eth.accounts[0] })
    }).then(function(result) {
      $("#msg").html("<p>Vote delegation successful.</p>")
    }).catch(function(err) {
      console.error("ERROR! " + err.message)
      $("#msg").html("<p>Delegation failed: " + err.message + "</p>")
    })
  }
}

// When the page loads, create a web3 instance and set a provider. Then set up the app.
window.addEventListener("load", function() {
  /*
  if (typeof web3 !== "undefined") {
    console.warn("Using web3 detected from external source like Metamask")
    window.web3 = new Web3(web3.currentProvider)
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8080. Remove this fallback when deploying live.")
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8080"))
  }
    */
  window.App.start()

  // Bind event listeners for the new features.
  document.getElementById("registerButton").addEventListener("click", function() {
    window.App.registerVoter()
  })

  document.getElementById("delegateButton").addEventListener("click", function() {
    var delegateAddress = document.getElementById("delegateAddress").value
    if (delegateAddress) {
      window.App.delegateVote(delegateAddress)
    } else {
      $("#msg").html("<p>Please enter a delegate address.</p>")
    }
  })
})
