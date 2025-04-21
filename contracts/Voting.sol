// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Voting {
    event AddedCandidate(uint indexed candidateID);
    event VoterRegistered(address indexed voter, bytes32 uid);
    event DelegationSet(address indexed from, address indexed to); 
    event VoteCast(address indexed voter, uint indexed candidateID);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    struct Voter {
        bytes32 uid;
        uint candidateIDVote;
        bool isRegistered;
        address delegatedTo;
        bool hasDelegated;
    }

    struct Candidate {
        string name;
        string party;
        bool doesExist;
    }

    uint public numCandidates;
    uint public numVoters;

    mapping(uint => Candidate) public candidates;
    mapping(uint => Voter)    public voters;
    mapping(address => uint)  public addressToVoterID;
    mapping(bytes32 => bool)  public registeredUIDs;

    function addCandidate(string memory name, string memory party) external onlyOwner {
        uint id = numCandidates++;
        candidates[id] = Candidate(name, party, true);
        emit AddedCandidate(id);
    }

    function registerVoter(bytes32 uid) external {
    require(!registeredUIDs[uid],                "UID already registered");
    require(
        voters[addressToVoterID[msg.sender]].isRegistered == false,
        "Address already registered"
    );

    uint voterID = numVoters++;
    voters[voterID]            = Voter(uid, 0, true, address(0), false);
    addressToVoterID[msg.sender] = voterID;
    registeredUIDs[uid]         = true;

    emit VoterRegistered(msg.sender, uid);
}

    function delegateVote(address to) external {
        uint voterID = addressToVoterID[msg.sender];
        require(voters[voterID].isRegistered, "Not registered");
        require(!voters[voterID].hasDelegated, "Already delegated");
        require(to != msg.sender, "Cannot delegate to self");

        uint toID = addressToVoterID[to];
        require(voters[toID].isRegistered, "Delegatee not registered");

        voters[voterID].delegatedTo = to;
        voters[voterID].hasDelegated = true;

        emit DelegationSet(msg.sender, to);
    }


      function vote(uint candidateID) public {
        uint voterID = addressToVoterID[msg.sender];
        require(voters[voterID].isRegistered, "Not registered");
        require(!voters[voterID].hasDelegated,  "Already delegated");
        require(candidates[candidateID].doesExist, "Candidate doesn't exist");

        voters[voterID].candidateIDVote = candidateID;

        // 🔔 EMIT the vote event
        emit VoteCast(msg.sender, candidateID);
    }

    
    function totalVotes(uint candidateID) public view returns (uint) {
        uint count;
        for (uint i = 0; i < numVoters; i++) {
            if (voters[i].candidateIDVote == candidateID) count++;
        }
        return count;
    }

    function getCandidate(uint id)
        external
        view
        returns (uint, string memory, string memory)
    {
        Candidate memory c = candidates[id];
        return (id, c.name, c.party);
    } 

    function getNumOfCandidates() public view returns (uint) {
    return numCandidates;
}

    function getVoterInfo(address voterAddr)
        external
        view
        returns (bytes32 uid, bool isRegistered, address delegatedTo, bool hasDelegated)
    {
        uint id = addressToVoterID[voterAddr];
        require(voters[id].isRegistered, "Not registered");
        Voter memory v = voters[id];
        return (v.uid, v.isRegistered, v.delegatedTo, v.hasDelegated);
    }
}
