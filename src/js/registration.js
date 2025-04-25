import { App } from "./init.js";

export async function registerVoter() {
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
  }
  
  export async function delegateVote() {
    const to = $('#delegateSelect').val();
    if(!to) return $('#msg').addClass('text-danger').text('Select delegate');
    try{
      await App.contracts.Voting.delegateVote(to,{from:App.account});
      $('#msg').removeClass('text-danger').addClass('text-success').text('Delegated');
    }catch(e){ console.error(e); $('#msg').addClass('text-danger').text(e.data?.reason||e.message);} 
  }