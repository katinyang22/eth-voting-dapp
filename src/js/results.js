// src/js/results.js
import { App } from "./init.js";

export async function findNumOfVotes() { 
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
 }
