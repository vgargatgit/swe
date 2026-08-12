window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-33-leader-election'] = {
  "day": 33,
  "title": "Leader Election",
  "subtitle": "Authority, safety, liveness, terms, leases, quorum, fencing, failover, and the cases where a leader is the wrong abstraction.",
  "tags": [
    "Leader election",
    "Safety & liveness",
    "Terms & epochs",
    "Fencing tokens",
    "Leases",
    "Majority quorum",
    "Split brain",
    "Raft"
  ],
  "core": "Leader election is the mechanism by which a group of nodes agrees that exactly one node currently has authority to perform some exclusive responsibility.",
  "sections": (window.DAY33_SECTIONS || [])
};
delete window.DAY33_SECTIONS;
