import { App } from "./init.js";

export async function loadCandidates() { 
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
 }
export async function vote() { 
    const id = $('input[name=candidate]:checked').val();
    if(id===undefined) return $('#msg').addClass('text-danger').text('Select a candidate');
    try{
      await App.contracts.Voting.vote(id,{from:App.account});
      $('#msg').removeClass('text-danger').addClass('text-success').text('Vote cast');
    }catch(e){ console.error(e); $('#msg').addClass('text-danger').text(e.data?.reason||e.message);}  
}
export async function subscribeToVoteEvents() { 
    const web3c = new web3.eth.Contract(VotingContract.abi, App.contracts.Voting.address);
    web3c.events.VoteCast({fromBlock:'latest'})
      .on('data',()=>App.findNumOfVotes())
      .on('error',e=>console.error(e));  
 }

