/* ============================================================
   Economic Survey indicators — the SHAPE, not the figures.

   Every indicator here was derived from the 18 Economy questions in the
   past-paper bank (data/pyq.js, s === "Economy"): these are the things
   HPPSC has actually asked about, not a general list of economics.

   The VALUES are deliberately empty. GSDP, per-capita income, sector
   shares, debt ratios and crop output change every year, and t-economy
   already says to take them from the current HP Economic Survey, which is
   tabled with the budget in March. Figures written from memory into an
   exam aid are worse than no figures: they look authoritative and cannot
   be dated.

   FILL THESE IN from the Survey. Put the survey's own name in `source` so
   the table can show where the numbers came from and when they go stale.
   A blank value renders as an em dash, so a half-filled table is fine.
   ============================================================ */

var ECON = {
  /* e.g. "HP Economic Survey 2024-25" — shown above the table. */
  source: "",
  /* Columns, oldest first. Rename or add as the Survey years move on. */
  years: ["2021-22", "2022-23", "2023-24", "2024-25 (BE)"],

  rows: [
    /* --- public finance: the single most-asked group --- */
    {grp:"Public finance", lb:"Revenue expenditure, share of total expenditure", unit:"%",  v:{}},
    {grp:"Public finance", lb:"Debt as a share of GSDP",                          unit:"%",  v:{}},
    {grp:"Public finance", lb:"State's own tax revenue, share of total revenue",  unit:"%",  v:{}},
    {grp:"Public finance", lb:"Grants from the Centre, share of revenue receipts", unit:"%", v:{}},
    {grp:"Public finance", lb:"Salary, pension, interest and subsidies, share of total expenditure", unit:"%", v:{}},
    {grp:"Public finance", lb:"Allocation to education",                          unit:"₹ crore", v:{}},
    {grp:"Public finance", lb:"Allocation to health",                             unit:"₹ crore", v:{}},

    /* --- income and output --- */
    {grp:"Income and output", lb:"GSDP at current prices",        unit:"₹ crore", v:{}},
    {grp:"Income and output", lb:"Per capita income, current prices", unit:"₹",   v:{}},
    {grp:"Income and output", lb:"Primary sector, share of GSVA",  unit:"%", v:{}},
    {grp:"Income and output", lb:"Secondary sector, share of GSVA", unit:"%", v:{}},
    {grp:"Income and output", lb:"Tertiary sector, share of GSVA",  unit:"%", v:{}},

    /* --- employment: PLFS is named explicitly in the 2025 paper --- */
    {grp:"Employment", lb:"Worker Population Ratio, all ages (PLFS)", unit:"%", v:{}},
    {grp:"Employment", lb:"Secondary sector, share of employment (PLFS)", unit:"%", v:{}},
    {grp:"Employment", lb:"Tertiary sector, share of employment (PLFS)",  unit:"%", v:{}},

    /* --- agriculture and horticulture --- */
    {grp:"Agriculture", lb:"Foodgrain production",  unit:"lakh MT", v:{}},
    {grp:"Agriculture", lb:"Potato production",     unit:"lakh MT", v:{}},
    {grp:"Agriculture", lb:"Apple production",      unit:"lakh MT", v:{}},
    {grp:"Agriculture", lb:"Area under tea",        unit:"hectares", v:{}},

    /* --- banking --- */
    {grp:"Banking", lb:"Average population per bank branch", unit:"persons", v:{}},
    {grp:"Banking", lb:"Credit–deposit ratio",               unit:"%",       v:{}}
  ]
};

if(typeof module !== "undefined" && module.exports){ module.exports = {ECON: ECON}; }
