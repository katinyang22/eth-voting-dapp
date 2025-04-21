// migrations/3_seed_candidates.js

const Voting = artifacts.require("Voting");

module.exports = async function (deployer, network, accounts) {
  // Only run against your local development network
  if (network !== "development") return;

  const v = await Voting.deployed();
  const countBN = await v.getNumOfCandidates();
  const count   = countBN.toNumber();

  // If you haven’t seeded yet, add two candidates
  if (count === 0) {
    console.log("🔄 Seeding candidates…");
    await v.addCandidate("Alice", "Independent", { from: accounts[0] });
    await v.addCandidate("Bob",   "Green",       { from: accounts[0] });
    await v.addCandidate("Sam",   "Labour",       { from: accounts[0] });
    await v.addCandidate("Don",   "Conservative",       { from: accounts[0] });
    console.log("✅ Seeded 4 candidates");
  } else {
    console.log(`⏭️  Already have ${count} candidate(s), skipping seed`);
  }
};
