/* ============================================================
   The Himachal exams this atlas serves.

   The material here — 270 records, the fact feed, the 151 quiz questions
   — is Himachal general studies, and every exam below tests it. What
   differs between them is depth and the rest of the paper, not the
   Himachal portion.

   The honesty rule: `papers` states what THIS REPO holds, not what
   exists in the world. All 448 past papers are HPAS. Every other exam
   reads 0 and says so on the page. An exam listed here with a paper bank
   it does not have would be the same failure as an invented figure.

   Bodies change. HPSSC Hamirpur was dissolved in February 2023 after the
   December 2022 paper leak and replaced by HPRCA. Re-check `updated`
   against the boards' own sites before each release.
   ============================================================ */

var EXAMS = {
  updated: "2026-09",
  rows: [
    {id:"hpas", name:"HPAS — Combined Competitive Examination",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class I / II",
     what:"The heaviest Himachal paper of the lot: geography, history from the janapadas to statehood, art and culture, polity and the state economy, in prelims and again in mains.",
     papers:{n:448, years:"2020–2025"},
     covers:["map","timeline","battles","topics","people","compare","revise"]},

    {id:"hppsc-asst-prof", name:"Assistant Professor",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class I",
     what:"Subject papers carry the weight, but the general-studies section asks the same Himachal geography, history and polity as everything else on this list.",
     papers:{n:0, years:""},
     covers:["map","timeline","topics","people"]},

    {id:"hp-police-constable", name:"Police Constable",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class III",
     what:"A written paper of general knowledge with a distinct Himachal section — districts, rivers, passes, fairs and the freedom movement.",
     papers:{n:0, years:""},
     covers:["map","topics","rounds","compare"]},

    {id:"hprca-patwari", name:"Patwari",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Himachal geography and revenue administration, with districts, tehsils and land settlement history worth knowing cold.",
     papers:{n:0, years:""},
     covers:["map","compare","topics","rounds"]},

    {id:"hprca-panchayat-secretary", name:"Panchayat Secretary",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Himachal general knowledge alongside panchayati raj — the polity notes and the district profiles carry most of it.",
     papers:{n:0, years:""},
     covers:["topics","map","compare","rounds"]},

    {id:"hprca-joa-it", name:"Junior Office Assistant (IT)",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Computer knowledge is its own half; the other half is general knowledge in which Himachal is the largest single block.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics","compare"]},

    {id:"hprca-clerk", name:"Clerk",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"General knowledge with a standing Himachal section: districts, rivers, culture and the making of the state.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics","compare"]},

    {id:"hp-tet-jbt", name:"HP TET — JBT",
     body:"HPBOSE, Dharamshala", bodyUrl:"https://hpbose.org/", level:"Teacher eligibility",
     what:"150 questions in 150 minutes, no negative marking. Pedagogy dominates, but the Himachal general-awareness portion is drawn from exactly this material.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics"]},

    {id:"hp-tet-tgt", name:"HP TET — TGT",
     body:"HPBOSE, Dharamshala", bodyUrl:"https://hpbose.org/", level:"Teacher eligibility",
     what:"Arts, Medical and Non-Medical variants share a general-awareness section in which Himachal geography, history and culture recur every year.",
     papers:{n:0, years:""},
     covers:["rounds","map","timeline","topics"]}
  ]
};

if(typeof module !== "undefined" && module.exports){ module.exports = {EXAMS: EXAMS}; }
