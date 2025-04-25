// src/js/ui.js
import { registerVoter, delegateVote } from "./registration.js";
import { vote, loadCandidates, subscribeToVoteEvents } from "./voting.js";
import { findNumOfVotes } from "./results.js";

export function bindEvents() {
  $("#registerButton").click(registerVoter);
  $("#delegateBtn").click(delegateVote);
  $("#voteBtn").click(vote);
  $("#countVotesBtn").click(findNumOfVotes);
}

$(async () => {
  await loadCandidates();
  bindEvents();
  subscribeToVoteEvents();
  setInterval(findNumOfVotes, 10_000);
});
