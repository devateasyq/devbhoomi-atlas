/* ============================================================
   Economic Survey indicators.

   The INDICATORS were derived from the eighteen Economy questions in the
   past-paper bank (data/pyq.js, s === "Economy") — these are what HPPSC
   has actually asked about.

   The FIGURES are sourced and dated. Every row names where its numbers
   came from, and every column names the exact financial year, because the
   same indicator is revised between the Budget Estimate, the Revised
   Estimate and the actuals — a figure without its year label is a wrong
   answer waiting to happen.

   Blank cells are honest: no figure was found in these sources for that
   year. They render as an em dash. Fill them from the Survey itself.

   VERIFY BEFORE THE EXAM. The Survey is tabled with the budget each March;
   when the next one lands these are superseded, and the source line under
   the table is what tells you how old they are.
   ============================================================ */

var ECON = {
  source: "HP Economic Survey 2025-26, tabled March 2026, and PRS Budget Analysis",
  sources: [
    {lb: "PRS India — HP Budget Analysis 2026-27",
     url: "https://prsindia.org/budgets/states/himachal-pradesh-budget-analysis-2026-27"},
    {lb: "PRS India — HP Budget Analysis 2024-25",
     url: "https://prsindia.org/budgets/states/himachal-pradesh-budget-analysis-2024-25"},
    {lb: "Economics & Statistics Dept, HP — Economic Survey (official)",
     url: "https://himachalservices.nic.in/economics/en-IN/eco-survey-2022-23.html"}
  ],
  years: ["2024-25", "2025-26 (RE)", "2026-27 (BE)"],

  rows: [
    /* --- public finance: the single most-asked group --- */
    {grp:"Public finance", lb:"Revenue expenditure, share of total expenditure", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 84.2, "2026-27 (BE)": 93.7}},
    {grp:"Public finance", lb:"Capital outlay, share of total expenditure", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 15.8, "2026-27 (BE)": 6.2}},
    {grp:"Public finance", lb:"Outstanding liabilities, share of GSDP", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 41, "2026-27 (BE)": 40.5}},
    {grp:"Public finance", lb:"State's own tax revenue, share of revenue receipts", unit:"%",
     src:"PRS", v:{"2024-25": 35.8, "2026-27 (BE)": 37.9}},
    /* PRS reports devolution + grants together. Labelled as what it is,
       rather than as "grants" alone, which is a narrower thing. */
    {grp:"Public finance", lb:"Central transfers (devolution + grants), share of revenue receipts", unit:"%",
     src:"PRS", v:{"2024-25": 64.2, "2026-27 (BE)": 52.1}},
    {grp:"Public finance", lb:"Allocation to education", unit:"₹ crore", src:"", v:{}},
    {grp:"Public finance", lb:"Allocation to health", unit:"₹ crore", src:"", v:{}},

    /* --- income and output --- */
    {grp:"Income and output", lb:"GSDP at current prices", unit:"₹ crore",
     src:"Survey 2025-26; PRS 2026-27", v:{"2024-25": 209385, "2025-26 (RE)": 230587, "2026-27 (BE)": 277497}},
    {grp:"Income and output", lb:"Per capita income, current prices", unit:"₹",
     src:"Survey 2025-26", v:{"2025-26 (RE)": 283626}},
    {grp:"Income and output", lb:"GSDP growth, constant prices", unit:"%",
     src:"Survey 2025-26", v:{"2025-26 (RE)": 8.3}},
    /* PRS names these agriculture / manufacturing / services. Kept as the
       source words them, not translated into primary/secondary/tertiary,
       which are not quite the same brackets. */
    {grp:"Income and output", lb:"Agriculture, share of the economy", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 14.3}},
    {grp:"Income and output", lb:"Manufacturing, share of the economy", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 39.4}},
    {grp:"Income and output", lb:"Services, share of the economy", unit:"%",
     src:"PRS 2026-27", v:{"2025-26 (RE)": 46.3}},

    /* --- still to fill: no figure found in the sources above --- */
    {grp:"Employment", lb:"Worker Population Ratio, all ages (PLFS)", unit:"%", src:"", v:{}},
    {grp:"Employment", lb:"Secondary sector, share of employment (PLFS)", unit:"%", src:"", v:{}},
    {grp:"Employment", lb:"Tertiary sector, share of employment (PLFS)", unit:"%", src:"", v:{}},

    {grp:"Agriculture", lb:"Foodgrain production", unit:"lakh MT", src:"", v:{}},
    {grp:"Agriculture", lb:"Potato production", unit:"lakh MT", src:"", v:{}},
    {grp:"Agriculture", lb:"Apple production", unit:"lakh MT", src:"", v:{}},
    {grp:"Agriculture", lb:"Area under tea", unit:"hectares", src:"", v:{}},

    {grp:"Banking", lb:"Average population per bank branch", unit:"persons", src:"", v:{}},
    {grp:"Banking", lb:"Credit–deposit ratio", unit:"%", src:"", v:{}}
  ]
};

if(typeof module !== "undefined" && module.exports){ module.exports = {ECON: ECON}; }
