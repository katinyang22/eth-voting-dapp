// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Voting {
   
    event AddedCandidate(uint indexed candidateID);
    event VoterRegistered(address indexed voter, bytes32 uid);
    event DelegationSet(address indexed from, address indexed to);
    event VoteCast(address indexed voter, uint indexed candidateID);

   
    address public owner;
    constructor() { owner = msg.sender; }
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }


    struct Voter {
        bytes32 uid;
        bool    isRegistered;
        address delegatedTo;
        bool    hasDelegated;
    }
    struct Candidate {
        string name;
        string party;
        bool   doesExist;
    }


    uint public numCandidates;
    uint public numVoters;

    mapping(uint   => Candidate) public candidates;
    mapping(address => Voter)     public voters;
    mapping(bytes32 => bool)      public registeredUIDs;

    // NEW: simple, per-candidate tally
    mapping(uint => uint)         public voteCount;

   
    function addCandidate(string memory name, string memory party)
        external onlyOwner
    {
        uint id = numCandidates++;
        candidates[id] = Candidate(name, party, true);
        emit AddedCandidate(id);
    }

 
    function registerVoter(bytes32 uid) external {
        require(!registeredUIDs[uid],            "UID already registered");
        require(!voters[msg.sender].isRegistered, "Address already registered");

        voters[msg.sender] = Voter(uid, true, address(0), false);
        registeredUIDs[uid] = true;
        numVoters++;

        emit VoterRegistered(msg.sender, uid);
    }


    function delegateVote(address to) external {
        Voter storage sender = voters[msg.sender];
        require(sender.isRegistered,      "Not registered");
        require(!sender.hasDelegated,     "Already delegated");
        require(to != msg.sender,         "Cannot delegate to self");
        require(voters[to].isRegistered,  "Delegatee not registered");

        sender.delegatedTo  = to;
        sender.hasDelegated = true;
        emit DelegationSet(msg.sender, to);
    }


    function vote(uint candidateID) external {
        Voter storage sender = voters[msg.sender];
        require(sender.isRegistered,       "Not registered");
        require(!sender.hasDelegated,      "Already delegated");
        require(candidates[candidateID].doesExist, "No such candidate");

        voteCount[candidateID] += 1;
        emit VoteCast(msg.sender, candidateID);
    }

 
    function totalVotes(uint candidateID) external view returns (uint) {
        return voteCount[candidateID];
    }

    
    function getCandidate(uint id)
        external view
        returns (uint, string memory, string memory)
    {
        Candidate storage c = candidates[id];
        return (id, c.name, c.party);
    }

   
    function getNumOfCandidates() external view returns (uint) {
        return numCandidates;
    }

    
    function getVoterInfo(address who)
        external view
        returns (bytes32, bool, address, bool)
    {
        Voter storage v = voters[who];
        require(v.isRegistered, "Not registered");
        return (v.uid, v.isRegistered, v.delegatedTo, v.hasDelegated);
    }
}
