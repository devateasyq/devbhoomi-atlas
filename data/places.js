
/* ============================================================
   DATA — one record per entity, every record carries an id and
   a `rel` list. Views are projections of this object; nothing
   below is duplicated into a view.
   ============================================================ */
const D = {};

D.eras = [
 {id:"e1", name:"Prehistory & the Vedic Hills", span:"c. 40,000 BCE – 1000 BCE", v:"--e1"},
 {id:"e2", name:"Janapadas & Hill Republics",   span:"c. 1000 BCE – 300 CE",     v:"--e2"},
 {id:"e3", name:"Empires: Maurya to Harsha",    span:"326 BCE – 647 CE",         v:"--e3"},
 {id:"e4", name:"Rise of the Hill States",      span:"c. 550 – 1526",            v:"--e4"},
 {id:"e5", name:"Hill States & the Mughals",    span:"1526 – 1752",              v:"--e5"},
 {id:"e6", name:"Sansar Chand & the Sikhs",     span:"1752 – 1846",              v:"--e6"},
 {id:"e7", name:"The Gorkha Invasion",          span:"1790 – 1816",              v:"--e7"},
 {id:"e8", name:"British Paramountcy",          span:"1815 – 1947",              v:"--e8"},
 {id:"e9", name:"Praja Mandal & Freedom",       span:"1848 – 1948",              v:"--e9"},
 {id:"e10",name:"Making Himachal Pradesh",      span:"1948 – present",           v:"--e10"}
];

/* ---------- 12 DISTRICTS ---------- */
D.districts = [
{id:"d-bilaspur", name:"Bilaspur", map:"Bilaspur", hq:"Bilaspur", div:"Mandi",
 formed:"1 July 1954", area:1167, pop:381956, den:327, lit:84.59, sr:981,
 fromStates:["s-kahlur"],
 blocks:[
  ["p","Formed from the princely state of <b>Kahlur</b>, Bilaspur was a separate Part-C state from 1948 until it was merged into Himachal Pradesh on <b>1 July 1954 as its fifth district</b> — the only district to join by merger of a full state rather than by transfer or reorganisation."],
  ["p","The old town of Bilaspur was <b>submerged by the Gobind Sagar reservoir</b> of the Bhakra dam; a new town was laid out on higher ground. Bilaspur is the first fully planned town of independent India in this sense, and the displacement it caused is a standing question on rehabilitation policy."],
  ["ul",["<b>Naina Devi</b> — one of the Shakti Peeths, on a hilltop overlooking Gobind Sagar.","<b>Bhakra Dam</b> (on the Sutlej, at Bhakra village) — foundation 1948, commissioned 1963.","<b>Kandror bridge</b> over the Sutlej, once Asia's highest arch bridge.","<b>Nalwari fair</b> — the cattle fair started in 1889 by W. Goldstein."]],
  ["note","Exam hook","Bilaspur is the answer to three different questions: 5th district (1 July 1954), the Kahlur state (founded 697 CE by Bir Chand), and the Bhakra displacement. Keep the three separate."]
 ], rel:["s-kahlur","ev-bilaspur-merger","t-bhakra","t-shaktipeeth","d-mandi","d-hamirpur"]},

{id:"d-chamba", name:"Chamba", map:"Chamba", hq:"Chamba", div:"Kangra",
 formed:"15 April 1948", area:6528, pop:519080, den:80, lit:72.17, sr:986,
 fromStates:["s-chamba"],
 blocks:[
  ["p","One of the <b>four original districts</b> created on 15 April 1948 (with Mandi, Sirmaur and Mahasu). It preserves the territory of Chamba state, the oldest continuously ruled princely state in the region, and has the <b>lowest literacy rate</b> of any HP district."],
  ["p","Chamba holds the densest concentration of early temple architecture and epigraphy in the state, because it lay outside the reach of most invasions — Mughal and Sikh authority here was always nominal."],
  ["ul",["<b>Bharmour (Brahmpura)</b> — the original capital; the <i>Chaurasi</i> temple complex with the 7th-century Lakshana Devi temple.","<b>Laxmi Narayan temple group</b> at Chamba town, begun by Sahil Varman.","<b>Bhuri Singh Museum</b> (1908) — Chamba rumals, Pahari paintings, inscriptions.","<b>Minjar fair</b> — held in Chamba in July/August, a state-level fair.","<b>Pangi and Bharmour</b> — tribal areas (Pangwala and Gaddi)."]],
  ["note","Geography","Second largest district by area. The Ravi rises in Bara Bangahal and flows through it; the Chandrabhaga (Chenab) crosses Pangi. Sach Pass connects Chamba to Pangi."]
 ], rel:["s-chamba","t-tribes","t-temples","t-pahari-painting","ev-chamba-founded","d-kangra","d-lahaul"]},

{id:"d-hamirpur", name:"Hamirpur", map:"Hamirpur", hq:"Hamirpur", div:"Mandi",
 formed:"1 September 1972", area:1118, pop:454768, den:407, lit:88.15, sr:1095,
 fromStates:["s-kangra"],
 blocks:[
  ["p","Carved out of Kangra district on <b>1 September 1972</b> in the great reorganisation that also created Una and Solan. It is the <b>smallest district by area</b>, and holds the state's <b>highest literacy rate (88.15%)</b> and <b>highest sex ratio (1095)</b> — both reliable exam facts."],
  ["p","Named after Raja Hamir Chand of Kangra (r. c. 1700–1740), who built the fort here. The district's other historical anchor is <b>Sujanpur Tira</b>, the pleasure capital built by Abhaya Chand and made famous by Sansar Chand II, where the Kangra school of painting reached its height."],
  ["ul",["<b>Mahal Morian</b> — where Amar Singh Thapa's Gorkhas defeated Sansar Chand in 1806.","<b>Sujanpur Tira</b> — Sansar Chand's court, Holi fair, Narbadeshwar temple murals.","<b>Nadaun</b> — site of the Battle of Nadaun (1691); a Beas-bank town.","Highest density of remittance and defence-services households in HP."]],
  ["note","Exam hook","Hamirpur: smallest by area, highest literacy, highest sex ratio. Lahaul & Spiti: largest by area, lowest density, lowest population. These two are the extremes of almost every HP table."]
 ], rel:["s-kangra","p-sansarchand","b-mahalmorian","b-nadaun","t-pahari-painting","d-kangra","d-una"]},

{id:"d-kangra", name:"Kangra", map:"Kangra", hq:"Dharamshala", div:"Kangra",
 formed:"1 November 1966 (transferred from Punjab)", area:5739, pop:1510075, den:263, lit:85.67, sr:1012,
 fromStates:["s-kangra","s-guler","s-nurpur","s-siba","s-datarpur"],
 blocks:[
  ["p","The <b>most populous district</b> of Himachal Pradesh (1.51 million, about 22% of the state). It came to HP on <b>1 November 1966</b> under the Punjab Reorganisation Act, along with Kullu, Shimla, Lahaul & Spiti, Nalagarh and parts of Una — the transfer that doubled the size of Himachal."],
  ["p","Historically this is <b>Trigarta</b>, the oldest named polity in the region, ruled by the <b>Katoch</b> dynasty from Nagarkot (Kangra) fort. The British annexed it in 1846 after the First Anglo-Sikh War and made it a district of Punjab — which is why it had to be transferred back in 1966."],
  ["ul",["<b>Kangra Fort</b> — Nagarkot; sacked by Mahmud Ghazni (1009), taken by Jahangir's forces (1620), held by Ranjit Singh (1809–1846), ruined by the 1905 earthquake.","<b>Dharamshala</b> — district HQ and the <b>winter capital</b> of Himachal Pradesh since 2017; seat of the Tibetan government-in-exile since 1960.","<b>Masroor rock-cut temples</b> — 8th-century monolithic shrines, the 'Ellora of the Himalayas'.","<b>Jwalamukhi, Brajeshwari (Kangra) and Chamunda Devi</b> — three of HP's Shakti Peeths.","<b>Baijnath</b> — 1204 CE Shiva temple in Nagara style.","<b>Kangra tea</b> — planted from 1849; GI tag in 2005.","<b>Pong Dam (Maharana Pratap Sagar)</b> — a Ramsar wetland site on the Beas."]],
  ["note","Exam hook","Kangra: most populous district, largest number of assembly seats (15), the 1905 earthquake (4 April 1905, ~20,000 deaths), and the Kangra school of painting."]
 ], rel:["s-kangra","s-guler","s-nurpur","b-kangra1620","b-kangra1809","ev-kangra-quake","t-pahari-painting","t-temples","t-shaktipeeth","p-sansarchand","d-hamirpur","d-chamba","d-una"]},

{id:"d-kinnaur", name:"Kinnaur", map:"Kinnaur", hq:"Reckong Peo", div:"Shimla",
 formed:"1 May 1960", area:6401, pop:84121, den:13, lit:80.00, sr:819,
 fromStates:["s-bushahr"],
 blocks:[
  ["p","Carved out of Mahasu district on <b>1 May 1960</b> as HP's sixth district, from the upper reaches of Bushahr state. It is a <b>Scheduled Tribe district</b> — the Kinnaura are the majority — and has the <b>lowest sex ratio (819)</b> in the state."],
  ["p","Kinnaur is the classical <b>Kinnara</b> country of the Mahabharata and Puranas, the frontier of the Indo-Tibetan world. The Sutlej enters India here at <b>Shipki La</b>, and the district carries both the Hindu and the Tibetan Buddhist traditions side by side, often in the same village temple."],
  ["ul",["<b>Reo Purgyil (6,816 m)</b> — the highest peak in Himachal Pradesh.","<b>Kinner Kailash</b> and its 79-foot rock Shivling.","<b>Sangla / Baspa valley</b> and <b>Kamru fort</b>, the earliest seat of Bushahr.","<b>Nako lake</b> and the Nako and Ropa valleys.","<b>Chini / Kalpa</b>, the old district and British-era hill station.","Chilgoza pine, apples and the highest per-capita incomes in rural HP."]],
  ["note","Exam hook","Kinnaur: lowest sex ratio (819), Reo Purgyil, Shipki La (Sutlej entry), a tribal district, and polyandry as a traditional custom now in decline."]
 ], rel:["s-bushahr","t-tribes","t-passes","t-peaks","t-rivers","d-shimla","d-lahaul"]},

{id:"d-kullu", name:"Kullu", map:"Kullu", hq:"Kullu", div:"Mandi",
 formed:"1 November 1966 (transferred from Punjab)", area:5503, pop:437903, den:80, lit:79.40, sr:942,
 fromStates:["s-kullu"],
 blocks:[
  ["p","Ancient <b>Kuluta</b>, the 'end of the habitable world' (<i>Kulanthapitha</i>) of Sanskrit texts, in the upper Beas valley. Transferred from Punjab on <b>1 November 1966</b>."],
  ["p","The founding tradition credits <b>Bihangmani Pal</b>, who came from Prayag and established himself at <b>Jagatsukh</b>; the capital later moved to <b>Naggar</b> and then to <b>Sultanpur (Kullu town)</b> under Raja Jagat Singh in the 17th century."],
  ["ul",["<b>Kullu Dussehra</b> — begins on Vijaya Dashami when the rest of India ends, runs seven days, and centres on <b>Raghunathji</b>, whose image Jagat Singh brought from Ayodhya to expiate the Durga Dutt affair.","<b>Bijli Mahadev</b>, <b>Hidimba Devi (Manali, 1553)</b>, <b>Manu temple</b>.","<b>Great Himalayan National Park</b> — UNESCO World Heritage Site (2014).","<b>Parvati, Sainj, Tirthan</b> valleys; Malana with its Jamlu tradition.","Apple belt; Rohtang and Jalori passes."]],
  ["note","Exam hook","Kullu: 1857 rebellion of Pratap Singh and Vir Singh (hanged at Dharamshala); the Kuluta coin of Raja Virayasa; Dussehra that starts when Dussehra ends."]
 ], rel:["s-kullu","ev-1857","t-fairs","t-temples","t-nationalparks","d-mandi","d-lahaul","d-shimla"]},

{id:"d-lahaul", name:"Lahaul and Spiti", map:"Lahaul and Spiti", hq:"Keylong", div:"Mandi",
 formed:"1 November 1966 (transferred from Punjab)", area:13835, pop:31564, den:2, lit:76.81, sr:903,
 fromStates:["s-kullu","s-bushahr"],
 blocks:[
  ["p","The <b>largest district by area (13,835 km², about a quarter of the state)</b> and the <b>smallest by population (31,564)</b>, with a density of <b>2 persons per km²</b> — the lowest in Himachal and among the lowest in India. It was also the only district to record a <b>negative decadal growth rate</b> in 2011."],
  ["p","Two distinct valleys under one administration: <b>Lahaul</b> (Chandra and Bhaga, meeting at Tandi to form the Chenab) and <b>Spiti</b> (the Spiti river, a Sutlej tributary), separated by the Kunzum pass. Both are cold deserts in the rain shadow of the Great Himalayan range and are Scheduled Tribe areas."],
  ["ul",["<b>Tabo monastery (996 CE)</b> — the 'Ajanta of the Himalayas', founded by Rinchen Zangpo; a Monument of National Importance.","<b>Key, Dhankar, Kardang, Shashur, Guru Ghantal, Tayul</b> monasteries.","<b>Baralacha La, Kunzum La, Rohtang, Shinku La, Parang La</b> passes; the <b>Atal Tunnel</b> (opened 3 October 2020, 9.02 km) under Rohtang.","<b>Chandra Tal</b> and <b>Suraj Tal</b> (among the highest lakes in India).","<b>Pin Valley National Park</b> — snow leopard and Siberian ibex habitat."]],
  ["note","Exam hook","Largest area, smallest population, lowest density, negative growth, cold desert, Tabo 996 CE, Chandra + Bhaga = Chenab at Tandi. Almost every 'extreme value' question about HP points here."]
 ], rel:["t-monasteries","t-passes","t-lakes","t-tribes","t-rivers","t-nationalparks","d-kullu","d-kinnaur","d-chamba"]},

{id:"d-mandi", name:"Mandi", map:"Mandi", hq:"Mandi", div:"Mandi",
 formed:"15 April 1948", area:3950, pop:999777, den:253, lit:81.53, sr:1007,
 fromStates:["s-mandi","s-suket"],
 blocks:[
  ["p","One of the <b>four original districts</b> of 15 April 1948, formed by joining the two Sena states of <b>Mandi</b> and <b>Suket</b>. Second most populous district and the geographical hinge of the state — the point where the Kangra, Kullu and Shimla road systems meet."],
  ["p","Mandi town was founded in <b>1526 by Raja Ajbar Sen</b>, who moved his seat from Bhiuli and built the Bhootnath temple. The town's density of stone shikhara temples earns it the name <b>'Varanasi of the hills' (Choti Kashi)</b>."],
  ["ul",["<b>Mandi Shivratri</b> — the international fair where the deities of the district assemble before Madho Rai.","<b>Rewalsar (Tso Pema)</b> — sacred to Hindus, Buddhists and Sikhs; associated with Padmasambhava.","<b>Prashar lake</b> with its three-tiered pagoda temple, and <b>Kamrunag</b>.","<b>Mandi Conspiracy (1914–15)</b> — the Ghadar party's plan involving Mandi and Suket.","<b>Pandoh dam</b>, the Beas–Sutlej Link, and Barot (Shanan project, 1932)."]],
  ["note","Exam hook","Mandi founded 1526 by Ajbar Sen. Suket founded 765 CE by Bir Sen. Mandi and Suket are branches of the same Sena line — Suket is the elder."]
 ], rel:["s-mandi","s-suket","ev-mandi-conspiracy","ev-suket-satyagraha","t-fairs","t-temples","d-kullu","d-bilaspur","d-hamirpur"]},

{id:"d-shimla", name:"Shimla", map:"Shimla", hq:"Shimla", div:"Shimla",
 formed:"1 September 1972 (present form)", area:5131, pop:814010, den:159, lit:83.64, sr:915,
 fromStates:["s-keonthal","s-bushahr","s-jubbal","s-bhajji","s-kumharsain","s-dhami"],
 blocks:[
  ["p","The state capital and the third most populous district. Its present shape dates from the reorganisation of <b>1 September 1972</b>, when the old <b>Mahasu</b> district was dissolved and merged with Shimla. Shimla town itself was the <b>summer capital of British India</b> from 1864 to 1939."],
  ["p","The district is a mosaic of the former <b>Simla Hill States</b> — Keonthal, Jubbal, Bhajji, Kumharsain, Balsan, Theog, Dhami, Koti, Ghund, Madhan and others — which is why so much of the Praja Mandal story is set here."],
  ["ul",["<b>Rothney Castle</b> — A. O. Hume's house, where the idea of the Indian National Congress took shape.","<b>Viceregal Lodge (1888)</b>, now the Indian Institute of Advanced Study; the 1945 <b>Simla Conference</b> and the 1972 <b>Simla Agreement</b> were held at Shimla.","<b>Gaiety Theatre (1887)</b>, the Ridge, Christ Church (1857), Jakhoo temple.","<b>Kalka–Shimla Railway (1903)</b> — UNESCO World Heritage Site (2008).","<b>Dhami firing (16 July 1939)</b> and the <b>Sanjauli</b> sessions of the Himalayan Hill States Regional Council.","<b>Hatkoti</b> (Hateshwari Mata), <b>Chanshal pass</b>, the Pabbar valley apple belt."]],
  ["note","Exam hook","Shimla: summer capital of British India 1864–1939; Kalka–Shimla Railway 1903 (UNESCO 2008); Simla Agreement 2 July 1972; Mahasu district merged into Shimla on 1 September 1972."]
 ], rel:["s-keonthal","s-bushahr","s-jubbal","ev-shimla-summer-capital","ev-dhami","t-british-shimla","t-fairs","d-solan","d-kinnaur","d-sirmaur"]},

{id:"d-sirmaur", name:"Sirmaur", map:"Sirmaur", hq:"Nahan", div:"Shimla",
 formed:"15 April 1948", area:2825, pop:529855, den:188, lit:78.80, sr:918,
 fromStates:["s-sirmaur"],
 blocks:[
  ["p","One of the <b>four original districts</b> of 15 April 1948, coinciding with the old state of Sirmaur. The southernmost district, it descends from the Churdhar massif to the Shivaliks and the Paonta Doon, and so contains the state's widest range of altitudes and crops."],
  ["p","Sirmaur was the first hill state to fall to the Gorkhas (1803) and the first to be recovered — the <b>Battle of Jaithak (1814–15)</b> was the hardest fighting of the Anglo-Gorkha war."],
  ["ul",["<b>Nahan</b> — founded in 1621 by Raja Karam Prakash; rulers of Sirmaur carry the suffix <i>Prakash</i>.","<b>Renuka lake</b> — the largest natural lake in Himachal Pradesh, with the Renukaji fair.","<b>Paonta Sahib</b> — Guru Gobind Singh's residence 1685–88 and the <b>Battle of Bhangani (1688)</b>.","<b>Pajhota agitation (1942)</b> — the 'Bhai do na pai' movement, treated as an extension of Quit India.","<b>Churdhar (3,647 m)</b> — the highest peak of the outer Himalaya in HP.","Sirmauri Tal, the old capital, said to have been destroyed by a flood."]],
  ["note","Exam hook","Renuka = largest natural lake. Churdhar = highest peak outside the greater Himalaya. Pajhota = Quit India in the hills. Jaithak = the fort the British could not storm."]
 ], rel:["s-sirmaur","b-jaithak","b-bhangani","ev-pajhota","t-lakes","t-fairs","d-solan","d-shimla"]},

{id:"d-solan", name:"Solan", map:"Solan", hq:"Solan", div:"Shimla",
 formed:"1 September 1972", area:1936, pop:580320, den:300, lit:83.68, sr:880,
 fromStates:["s-baghat","s-baghal","s-nalagarh","s-kunihar"],
 blocks:[
  ["p","Created on <b>1 September 1972</b> out of parts of the dissolved Mahasu district and Shimla, together with the Nalagarh area that had come from Punjab in 1966. It assembles the old states of <b>Baghat (capital Solan), Baghal (Arki), Hindur (Nalagarh), Kunihar and Mahlog</b>."],
  ["p","Solan is the state's <b>industrial engine</b>: the Baddi–Barotiwala–Nalagarh (BBN) belt is one of Asia's largest pharmaceutical manufacturing clusters, and the district reports the state's highest urban share and lowest sex ratio outside Kinnaur."],
  ["ul",["<b>Arki fort</b> and its wall paintings — the Arki sub-school of Pahari painting.","<b>Shoolini Devi</b> temple, after whom Solan is named; the Shoolini fair.","<b>Subathu</b> — the first British cantonment in the hills (1815), seat of the Political Agent.","<b>Kasauli</b> — Central Research Institute (1905), and the starting point of the 1857 rising in the hills.","<b>Dr. Y. S. Parmar University of Horticulture and Forestry</b>, Nauni.","Mushroom cultivation — Solan is called the 'Mushroom City of India'; also the tomato belt."]],
  ["note","Exam hook","Solan holds the BBN pharma belt (industry questions), Subathu (British administration questions) and Arki (painting questions). Three different papers, one district."]
 ], rel:["s-baghat","s-baghal","s-nalagarh","ev-1857","t-industry","t-pahari-painting","t-british-shimla","d-shimla","d-sirmaur","d-bilaspur"]},

{id:"d-una", name:"Una", map:"Una", hq:"Una", div:"Kangra",
 formed:"1 September 1972", area:1540, pop:521173, den:338, lit:86.53, sr:976,
 fromStates:["s-kangra","s-jaswan","s-kutlehr"],
 blocks:[
  ["p","Carved out of Kangra district on <b>1 September 1972</b>. Una is the <b>lowest-lying district</b> in Himachal — the Beas leaves the state near Mirthal at about 300 m — and its plains and Shivalik <i>duns</i> make it the most 'Punjab-like' part of the state in climate, crops and dialect."],
  ["p","The territory belonged to the Katoch offshoot states of <b>Jaswan</b> (capital Rajpura, founded 1170) and <b>Kutlehr</b>, together with parts of Hoshiarpur district transferred in 1966."],
  ["ul",["<b>Chintpurni (Chhinnamastika)</b> — a Shakti Peeth and the district's principal pilgrimage.","<b>Dera Baba Rudru</b>, Dhaulagiri Dhar, and the Swan river — the 'sorrow of Una', now channelised.","<b>Gagret and Mehatpur</b> industrial areas; the Una–Hamirpur–Bilaspur rail alignment.","Second highest literacy rate in the state after Hamirpur."]],
  ["note","Exam hook","Una: lowest altitude, Swan river channelisation, Chintpurni. Created the same day as Hamirpur and Solan — 1 September 1972."]
 ], rel:["s-jaswan","s-kutlehr","t-shaktipeeth","t-rivers","d-kangra","d-hamirpur","d-bilaspur"]}
];


/* ---------- PRINCELY / HILL STATES ---------- */
D.states = [
{id:"s-chamba", name:"Chamba", seat:"chamba", capital:"Bharmour (c. 550–920), then Chamba", founder:"Maru Varman",
 founded:"c. 550 CE", dynasty:"Varman / Chamiyal Rajputs", group:"Punjab Hill States", merged:"15 April 1948",
 rulers:["Maru Varman (founder, seat at Bharmour)","Meru Varman (c. 680) — built the Lakshana Devi, Shakti Devi and Narsingh temples; his artist was Gugga","Sahil Varman (c. 920) — moved the capital to Chamba, named for his daughter Champavati","Prithvi Singh (1641–64) — Mughal-era consolidation","Umed Singh (1748–64) — built the Rang Mahal","Raj Singh (1764–94) — resisted Sansar Chand of Kangra","Bhuri Singh (1904–19) — founded the Bhuri Singh Museum, 1908","Lakshman Singh — last ruler, acceded 1948"],
 blocks:[
  ["p","The <b>oldest continuously ruled state</b> in the Himachal region and the one that best preserved its independence — Mughal and Sikh authority here was nominal, and the Gorkhas never held it. That continuity is why Chamba holds the state's richest collection of <b>temples, copper-plate grants and stone inscriptions</b>."],
  ["p","Founded at <b>Bharmour</b> (ancient <i>Brahmpura</i>) in about 550 CE by <b>Maru Varman</b>. Around 920 CE <b>Sahil Varman</b> shifted the capital down the Ravi to the site he named <b>Chamba</b> after his daughter <b>Champavati</b>, who by tradition gave her life so the water channel to the new town would flow — the Sui Mata fair commemorates her."],
  ["ul",["<b>Rajanaka Bhota Varman</b>'s and Meru Varman's inscriptions are the earliest firmly dated records in HP.","Chamba issued the <b>largest number of copper-plate grants</b> of any hill state.","<b>Chamba rumal</b> — the double-satin-stitch embroidery with a GI tag.","Raj Singh died fighting Sansar Chand's expansion; Chamba survived by allying with the Sikhs."]],
  ["note","Exam hook","Bharmour → Chamba (920 CE, Sahil Varman, daughter Champavati). Meru Varman's temples at the Chaurasi complex. Bhuri Singh Museum, 1908."]
 ], rel:["d-chamba","t-temples","t-pahari-painting","ev-chamba-founded","s-kangra","t-fairs"]},

{id:"s-kangra", name:"Kangra (Trigarta)", seat:"kangra", capital:"Nagarkot (Kangra), later Sujanpur Tira and Alampur", founder:"Susharma Chandra",
 founded:"traditionally c. 8th–9th century BCE", dynasty:"Katoch", group:"Punjab Hill States", merged:"Annexed by the British, 1846",
 rulers:["Susharma Chandra — Mahabharata tradition; fought on the Kaurava side; built Nagarkot","Jai Chand — imprisoned by Akbar","Bidhi Chand","Hamir Chand (c. 1700–40) — Hamirpur is named after him","Abhaya Chand — built Sujanpur Tira","Ghamand Chand (1761–74) — appointed Nazim of Jalandhar Doab by Ahmad Shah Abdali","Sansar Chand II (1775–1823) — the Katoch golden age and its collapse"],
 blocks:[
  ["p","The <b>Katoch</b> house of Kangra claims descent from <b>Susharma Chandra</b> of the Mahabharata, which would make it one of the oldest surviving royal lines in the world. The state's identity is inseparable from <b>Nagarkot (Kangra) fort</b>, the strongest fortress in the western Himalaya and the prize every invader wanted."],
  ["p","Kangra's history is a sequence of losses and recoveries of that fort: sacked by <b>Mahmud Ghazni in 1009</b>, raided by <b>Firoz Shah Tughlaq in 1360</b>, taken by the <b>Mughals in 1620</b> under Jahangir, recovered by <b>Sansar Chand in 1786</b>, lost to <b>Ranjit Singh in 1809</b>, and finally annexed by the <b>British in 1846</b> after the First Anglo-Sikh War."],
  ["ul",["Trigarta = the land drained by three rivers, usually read as the Ravi, Beas and Sutlej.","Panini called the people of Trigarta <b>Ayudhajivi</b> — those who live by arms.","The fort was ruined by the <b>Kangra earthquake of 4 April 1905</b>.","Because the British made Kangra a district of Punjab in 1846, it had to be <b>transferred back to HP on 1 November 1966</b>."]],
  ["note","Exam hook","Four dates for one fort: 1009 Ghazni, 1620 Jahangir, 1809 Ranjit Singh, 1846 British. Add 1786 (Sansar Chand recovers it) and 1905 (earthquake)."]
 ], rel:["d-kangra","p-sansarchand","b-kangra1620","b-kangra1809","b-mahalmorian","ev-kangra-quake","t-janapadas","t-pahari-painting","s-guler","s-nurpur"]},

{id:"s-kullu", name:"Kullu (Kuluta)", seat:"kullu", capital:"Jagatsukh → Naggar → Sultanpur", founder:"Bihangmani Pal",
 founded:"c. 1st–2nd century CE", dynasty:"Pal, later Singh", group:"Punjab Hill States", merged:"Annexed by the British, 1846",
 rulers:["Bihangmani Pal — came from Prayag; seat at Jagatsukh","Visudhpal — moved the capital to Naggar","Jagat Singh (1637–72) — brought Raghunathji from Ayodhya; moved the capital to Sultanpur","Man Singh (1688–1719) — the greatest extent of Kullu, annexed Lahaul, Spiti and Bara Bangahal","Pritam Singh / Ajit Singh — decline under the Sikhs"],
 blocks:[
  ["p","Ancient <b>Kuluta</b>, called <i>Kulanthapitha</i>, 'the end of the habitable world'. Its independence is proved by its own coinage: a copper coin of about the 1st–2nd century CE reads <b>'Rajna Virayasasya Kulutasya'</b> — of Virayasa, king of the Kulutas."],
  ["p","The defining episode is <b>Raja Jagat Singh</b> and the Durga Dutt affair. Having caused the death of a brahmin of Tipri who had been falsely accused of hoarding pearls, the raja was told to expiate the sin by installing an image of <b>Raghunath</b> brought from Ayodhya, and by ruling thereafter as the god's regent. From this comes <b>Kullu Dussehra</b>, which begins on Vijaya Dashami and lasts seven days."],
  ["ul",["Man Singh's reign brought Lahaul, Spiti and Bara Bangahal under Kullu.","Kullu fell to the Sikhs, then to the British in 1846, and was attached to Kangra district.","In 1857 <b>Pratap Singh and Vir Singh</b> of Kullu were hanged at Dharamshala (3 August 1857).","Raja Jagat Singh also built the temple of Raghunathji at Sultanpur."]],
  ["note","Exam hook","Bihangmani Pal (founder) → Jagatsukh → Naggar → Sultanpur (Jagat Singh). The Kuluta coin, and Dussehra that starts when everyone else's ends."]
 ], rel:["d-kullu","t-janapadas","t-fairs","ev-1857","s-mandi","t-temples"]},

{id:"s-mandi", name:"Mandi", seat:"mandi", capital:"Bhiuli → Mandi (1526)", founder:"Bahu Sen (line); Ajbar Sen founded Mandi town",
 founded:"1526 (town); the line separates from Suket in the 11th century", dynasty:"Sena", group:"Punjab Hill States", merged:"15 April 1948",
 rulers:["Bahu Sen — separated from the Suket line","Ajbar Sen (1499–1534) — founded Mandi town in 1526 and the Bhootnath temple","Sidh Sen (1684–1727) — the most powerful ruler of Mandi; Guru Gobind Singh visited his court","Shamsher Sen","Bijai Sen (1851–1902) — built the Victoria bridge (1877) and Vijay High School","Joginder Sen (1913–48) — last ruler; acceded 1948"],
 blocks:[
  ["p","Mandi and Suket are two branches of the same <b>Sena</b> house — Suket the elder, Mandi the younger. <b>Ajbar Sen</b> moved the seat across the Beas and founded <b>Mandi town in 1526</b>, the same year as the first battle of Panipat, which makes the date easy to hold."],
  ["p","<b>Sidh Sen</b> (1684–1727) is the ruler to remember: he extended Mandi at the expense of his neighbours, was reputed a tantric of great power, and received <b>Guru Gobind Singh</b> at his court. The Mandi–Suket rivalry was so entrenched that the two states were still disputing when they were merged into a single district in 1948."],
  ["ul",["Mandi is called <b>Choti Kashi</b> for its concentration of stone shikhara temples — Bhootnath, Trilokinath, Panchvaktra, Ardhanarishwar.","<b>Mandi Shivratri</b> is an international fair; the deities of the district assemble before <b>Madho Rai</b>.","The <b>Mandi Conspiracy of 1914–15</b> linked the Ghadar party to Mandi and Suket.","The <b>Shanan hydel project</b> at Jogindernagar (1932) was among the earliest in India, built under Raja Joginder Sen with Col. B. C. Batty."]],
  ["note","Exam hook","Mandi town 1526, Ajbar Sen. Suket 765 CE, Bir Sen. Sidh Sen 1684–1727 and Guru Gobind Singh. Mandi Conspiracy 1914–15."]
 ], rel:["d-mandi","s-suket","ev-mandi-conspiracy","t-temples","t-fairs","t-hydel"]},

{id:"s-suket", name:"Suket", seat:"pangna", capital:"Pangna → Lohara → Sundernagar (Banned)", founder:"Bir Sen (Vir Sen)",
 founded:"c. 765 CE", dynasty:"Sena", group:"Punjab Hill States", merged:"1948 — the last state to accede",
 rulers:["Bir Sen — founder, from the Sena house of Bengal by tradition","Sahu Sen","Garur Sen","Lakshman Sen — last ruler; acceded after the Suket Satyagraha"],
 blocks:[
  ["p","The <b>elder branch</b> of the Sena line and one of the oldest states in the region, traditionally founded about <b>765 CE by Bir Sen</b>, with its first capital at <b>Pangna</b>. The younger branch broke away to become Mandi, and the two states quarrelled for the next eight centuries."],
  ["p","Suket matters disproportionately for the freedom-struggle paper because of its ending. The <b>Suket Satyagraha</b>, launched from <b>Tattapani on 18 February 1948</b> under <b>Pandit Padam Dev</b>, was the last popular movement against a hill ruler; Suket's accession completed the integration that created Himachal Pradesh on 15 April 1948."],
  ["ul",["Capitals in order: <b>Pangna → Lohara → Sundernagar</b>.","Suket's fort at Pangna is among the oldest surviving hill forts in HP.","Sundernagar was renamed from Banned; it is now the site of the Beas–Sutlej Link power house."]],
  ["note","Exam hook","Suket = oldest Sena state (765 CE, Bir Sen, Pangna) and the last to merge (Suket Satyagraha, 18 February 1948, Tattapani, Padam Dev)."]
 ], rel:["d-mandi","s-mandi","ev-suket-satyagraha","p-padamdev","ev-hp-formation"]},

{id:"s-kahlur", name:"Kahlur (Bilaspur)", seat:"bilaspur", capital:"Kot Kahlur → Bilaspur", founder:"Bir Chand",
 founded:"697 CE", dynasty:"Chandel Rajputs of Chanderi", group:"Punjab Hill States", merged:"1948 as a separate Part-C state; into HP 1 July 1954",
 rulers:["Bir Chand — founder, said to have come from Chanderi in Bundelkhand","Dip Chand (1650–67) — moved the capital to Bilaspur town","Bhim Chand (1665–92) — fought Guru Gobind Singh at Bhangani; granted the site of Anandpur","Kharak Chand","Anand Chand — last ruler; Bilaspur acceded in 1948"],
 blocks:[
  ["p","Founded in <b>697 CE by Bir Chand</b>, a Chandel Rajput, with its seat at the fort of <b>Kot Kahlur</b>; the capital moved down to <b>Bilaspur</b> under Raja Dip Chand in the mid-17th century. Kahlur was the parent state of <b>Hindur (Nalagarh)</b> and at its height controlled much of the lower Sutlej."],
  ["p","Kahlur's most examined episode is its quarrel with the Sikh Gurus. <b>Raja Bhim Chand</b> led the hill chiefs against <b>Guru Gobind Singh</b> at the <b>Battle of Bhangani (1688)</b> and again at <b>Nadaun (1691)</b>, where the hill rajas and the Guru fought together against the Mughal commander Alif Khan."],
  ["ul",["Bilaspur remained a <b>separate Part-C state</b> from 1948 and joined Himachal only on <b>1 July 1954</b>, as its fifth district.","The <b>Bhakra dam</b> submerged the old town; its rehabilitation is a standard case study.","<b>Naina Devi</b>, a Shakti Peeth, lies within the old state."]],
  ["note","Exam hook","Kahlur 697 CE Bir Chand. Bilaspur merges 1 July 1954 — not 1948. The Part-C/Part-D distinction is examined."]
 ], rel:["d-bilaspur","s-nalagarh","b-bhangani","b-nadaun","ev-bilaspur-merger","t-bhakra","t-shaktipeeth"]},

{id:"s-sirmaur", name:"Sirmaur", seat:"nahan", capital:"Sirmauri Tal → Rajban → Nahan (1621)", founder:"Raja Rasaloo (tradition)",
 founded:"c. 1095 CE", dynasty:"Prakash (Jaisalmer Bhati tradition)", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Rasaloo — traditional founder; the old capital Sirmauri Tal was said to be destroyed by a flood","Karam Prakash — founded Nahan in 1621","Fateh Prakash","Karam Prakash II — lost the state to the Gorkhas in 1803","Fateh Prakash (restored 1815 by the British)","Rajendra Prakash — last ruler; acceded 1948"],
 blocks:[
  ["p","The southernmost hill state, and the <b>first to fall to the Gorkhas</b> in 1803 — which made it the natural place for the British counter-attack in 1814. Rulers take the suffix <b>Prakash</b>."],
  ["p","<b>Nahan</b> was founded in <b>1621 by Raja Karam Prakash</b>, after the earlier capital at <b>Sirmauri Tal</b> was destroyed. The state's other great association is with the Sikhs: <b>Guru Gobind Singh</b> lived at <b>Paonta Sahib</b> from 1685 to 1688 at the invitation of Raja Medini Prakash, and fought the <b>Battle of Bhangani</b> there in 1688."],
  ["ul",["<b>Battle of Jaithak (1814–15)</b> — the Gorkha garrison under Ranjor Singh Thapa held out against Major-General Gillespie's successor and inflicted heavy British losses.","<b>Pajhota agitation, 1942</b> — a Quit India-era rising in the Pajhota area against Rajendra Prakash's support for the war effort.","<b>Renuka</b> — the largest natural lake in HP, with an annual fair.","Sirmaur gave the Trans-Giri and Dodra-Kwar areas their distinct Hatti identity."]],
  ["note","Exam hook","Nahan founded 1621 (Karam Prakash). Gorkhas take Sirmaur 1803. Jaithak 1814–15. Pajhota 1942. Four dates, one state."]
 ], rel:["d-sirmaur","b-jaithak","b-bhangani","ev-pajhota","ev-gorkha-sirmaur","t-lakes"]},

{id:"s-bushahr", name:"Bushahr (Bashahr)", seat:"rampur", capital:"Kamru → Sarahan → Rampur", founder:"Pradyumna (tradition)",
 founded:"traditionally ancient; historically documented from the medieval period", dynasty:"Bushahr Rajputs", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Pradyumna — traditional founder, said to be a son of Krishna","Kehri Singh (1639–96) — received the title <i>Chhatrapati</i> from Aurangzeb and a trade treaty with Tibet","Ram Singh — founded Rampur","Ugar Singh","Shamsher Singh — sheltered Subedar Bhim Singh in 1857","Padam Singh — last ruler; acceded 1948"],
 blocks:[
  ["p","The <b>largest of the Simla Hill States</b>, stretching from the Sutlej gorge to the Tibetan border, with its capitals moving downstream over time: <b>Kamru</b> in the Baspa valley, then <b>Sarahan</b>, then <b>Rampur</b>."],
  ["p","Bushahr is the state to remember for <b>1857</b>: it was the <b>only hill state that neither helped the British nor supplied them troops</b>, and Raja Shamsher Singh sheltered <b>Subedar Bhim Singh</b> after the Kasauli rising. It is also the state with the longest record of popular protest — the <b>Dum Koti</b> and <b>Dujjam</b> movements against forced labour."],
  ["ul",["<b>Bhimakali temple at Sarahan</b> — a Shakti Peeth in the distinctive tower style, and the state deity.","<b>Lavi fair at Rampur</b> — the great trans-Himalayan trade fair, traced to Kehri Singh's treaty with Tibet.","<b>Dujjam movement (1906)</b> and the <b>Dum Koti rising (1859)</b> against <i>begar</i> (forced labour) and <i>reeth</i>.","Bushahr supplied the earliest and most persistent anti-<i>begar</i> agitation in the hills, later taken up by <b>Satyanand Stokes</b> at Kotgarh."]],
  ["note","Exam hook","Bushahr: only state that did not assist the British in 1857; Kehri Singh's Chhatrapati title and Tibet treaty; Lavi fair; Bhimakali; anti-begar movements."]
 ], rel:["d-kinnaur","d-shimla","ev-1857","ev-dujjam","t-fairs","t-temples","p-stokes"]},

{id:"s-nurpur", name:"Nurpur (Dhameri)", seat:"nurpur", capital:"Pathankot → Nurpur", founder:"Jhet Pal (tradition)",
 founded:"c. 11th century", dynasty:"Pathania Rajputs", group:"Punjab Hill States", merged:"Annexed by the British, 1846",
 rulers:["Basu (Bhao Singh) — Mughal service under Akbar and Jahangir","Suraj Mal — rebelled against Shah Jahan","Jagat Singh (1618–46) — helped take Kangra fort in 1620, later rebelled; his revolt was crushed in 1641–42","Ram Singh Pathania — led the rising of 1848"],
 blocks:[
  ["p","Originally <b>Dhameri</b>; renamed <b>Nurpur</b> in Jahangir's reign after Empress <b>Nur Jahan</b>. The Pathania rajas were the most militarily active of the hill chiefs in Mughal service — and the most rebellious."],
  ["p","<b>Raja Jagat Singh</b> helped the Mughal army take <b>Kangra fort in 1620</b>, was rewarded with territory, and then rebelled against Shah Jahan; his fort at Taragarh was reduced after a long campaign. Two centuries later <b>Ram Singh Pathania</b> led the <b>revolt of 1848</b> against the British — the first armed resistance to British rule in the hills."],
  ["ul",["<b>Brajraj Swami temple</b> — the black marble image of Krishna is said to have been brought from Chittor.","Nurpur is a centre of the Basohli-derived painting style, and of Pashmina shawl weaving.","Ram Singh Pathania was defeated near Shahpur, betrayed, and transported to Singapore, where he died in 1849."]],
  ["note","Exam hook","Dhameri → Nurpur (after Nur Jahan). Jagat Singh helps take Kangra 1620 then rebels. Ram Singh Pathania, 1848 — the first hill revolt against the British."]
 ], rel:["s-kangra","b-kangra1620","ev-ramsingh","p-ramsingh","t-pahari-painting","d-kangra"]},

{id:"s-guler", name:"Guler", seat:"guler", capital:"Haripur-Guler", founder:"Hari Chand",
 founded:"1405", dynasty:"Katoch (a branch of Kangra)", group:"Punjab Hill States", merged:"Lapsed to the British, 1846",
 rulers:["Hari Chand — founder; by tradition fell into a well while hunting, was given up for dead, and founded a new state on his return","Govardhan Chand (1741–73) — the great patron of painting","Prakash Chand"],
 blocks:[
  ["p","A Katoch offshoot founded in <b>1405 by Hari Chand</b>, whose founding story — presumed dead in a hunting accident, he emerged to find his brother enthroned and founded Haripur-Guler instead — is a standard one-liner."],
  ["p","Guler's importance is entirely artistic. Under <b>Raja Govardhan Chand</b> the family workshop of <b>Pandit Seu and his sons Manaku and Nainsukh</b> transformed the bold, hot Basohli manner into the soft, naturalistic <b>Guler style</b> — the 'pre-Kangra' phase from which the Kangra school grew in the 1780s."],
  ["ul",["The Guler–Kangra line of descent is the single most examined fact in HP art history: <b>Basohli → Guler → Kangra</b>.","<b>Nainsukh</b> worked for Balwant Singh of Jasrota; <b>Manaku</b> is associated with the <i>Gita Govinda</i> series of 1730."]],
  ["note","Exam hook","Guler 1405, Hari Chand. Govardhan Chand patronised Pandit Seu, Manaku and Nainsukh. Guler is the cradle of the Kangra school."]
 ], rel:["s-kangra","t-pahari-painting","d-kangra"]},

{id:"s-nalagarh", name:"Hindur (Nalagarh)", seat:"nalagarh", capital:"Nalagarh", founder:"Ajai Chand",
 founded:"1100", dynasty:"Chandel (a branch of Kahlur)", group:"Punjab Hill States", merged:"1948; transferred to HP 1 November 1966",
 rulers:["Ajai Chand — founder, a son of the Kahlur house","Ram Saran Singh — ruled during the Gorkha war and sided with the British","Bije Chand"],
 blocks:[
  ["p","An offshoot of Kahlur founded in <b>1100 by Ajai Chand</b>, guarding the Sutlej where it leaves the hills. Its fort of <b>Ramgarh</b> and the fort of <b>Malaun</b> nearby became the decisive ground of the <b>Anglo-Gorkha war</b>."],
  ["p","Nalagarh was administratively attached to Ambala district of Punjab, and so came to Himachal only with the <b>Punjab Reorganisation Act on 1 November 1966</b>, not in 1948 — a distinction that is regularly tested."],
  ["ul",["<b>Malaun fort</b> — where Amar Singh Thapa finally capitulated to David Ochterlony in May 1815.","The <b>Baddi–Barotiwala–Nalagarh (BBN)</b> industrial belt now occupies the old state's plains."]],
  ["note","Exam hook","Nalagarh came to HP in 1966, not 1948. It was a sub-division of Ambala district."]
 ], rel:["s-kahlur","b-malaun","ev-punjab-reorg","t-industry","d-solan"]},

{id:"s-keonthal", name:"Keonthal", seat:"junga", capital:"Junga", founder:"Giri Sen (tradition)",
 founded:"c. 1211", dynasty:"Sena (a branch of Suket)", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Giri Sen — traditional founder from the Suket line","Sansar Sen","Hitender Sen"],
 blocks:[
  ["p","The <b>premier Simla Hill State</b>, holding the land on which Shimla itself was built. The site of the future summer capital was Keonthal territory; it passed to the British after the Gorkha war, and the rest of the state was surrounded by the growing station."],
  ["p","Keonthal had a cluster of feudatories — <b>Koti, Theog, Madhan, Ghund, Ratesh</b> — and its ruler was the senior chief at the durbars of the Simla Hill States."],
  ["ul",["Shimla's land came from Keonthal and <b>Bhajji</b>, with the grants confirmed after 1815.","Junga remained the state capital; the palace survives."]],
  ["note","Exam hook","Shimla stood on Keonthal land. The state was the senior of the 28 Simla Hill States."]
 ], rel:["d-shimla","t-british-shimla","ev-shimla-summer-capital","s-bushahr"]},

{id:"s-jubbal", name:"Jubbal", seat:"jubbal", capital:"Jubbal", founder:"An offshoot of the Sirmaur house",
 founded:"c. 12th century (tradition)", dynasty:"Rana / Rawat, Sirmaur line", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Karam Chand","Padam Chand — last ruler; his Praja Mandal was among the most active"],
 blocks:[
  ["p","A Sirmaur offshoot in the upper Pabbar valley, best known for its <b>palace</b> (a striking hybrid of hill and European design) and for the strength of its <b>Praja Mandal</b>, which forced constitutional concessions before 1948."],
  ["p","Jubbal's apple economy, seeded from Kotgarh, made it unusually prosperous, and its educated peasantry made it one of the centres of the <b>Himalayan Hill States Regional Council</b>."]
 ], rel:["d-shimla","ev-hhsrc","t-fairs","p-stokes"]},

{id:"s-baghal", name:"Baghal", seat:"arki", capital:"Arki", founder:"Ajai Dev (tradition)",
 founded:"c. 1643", dynasty:"Panwar Rajputs", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Sabha Chand — established Arki as the capital","Rana Kishan Singh","Rana Jagat Singh"],
 blocks:[
  ["p","A Simla Hill State whose capital <b>Arki</b> holds one of the finest surviving sets of <b>wall paintings</b> in the hills — the Arki sub-school, painted in the <i>Diwan-e-Khas</i> of the fort in the early 19th century, mixing Kangra manner with Sikh and colonial subjects."],
  ["p","Arki was occupied by the Gorkhas and served as one of Amar Singh Thapa's forward bases before the British campaign of 1814–15."]
 ], rel:["d-solan","t-pahari-painting","b-malaun","ev-gorkha-sirmaur"]},

{id:"s-baghat", name:"Baghat", seat:"solanbaghat", capital:"Solan", founder:"Panwar Rajputs",
 founded:"medieval", dynasty:"Panwar", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Rana Mahendra Singh","Rana Durga Singh — Baghat was briefly lapsed to the British and then restored"],
 blocks:[
  ["p","A small Simla Hill State with its capital at <b>Solan</b>, named after the goddess <b>Shoolini Devi</b>. Baghat was <b>annexed by the British under the doctrine of lapse in 1850</b> and restored to Rana Durga Singh in 1862 — one of the few hill states to have been taken and given back."],
  ["p","The <b>Baghat Praja Mandal</b>, formed in 1938, was among the earliest and most organised in the hills."]
 ], rel:["d-solan","ev-prajamandal","t-british-shimla"]},

{id:"s-kunihar", name:"Kunihar", seat:"kunihar", capital:"Kunihar", founder:"Abhoj Dev",
 founded:"1154", dynasty:"Rana", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Abhoj Dev — founder","Rana Hardev Singh — faced the Kunihar Praja Mandal agitation"],
 blocks:[
  ["p","A tiny state, but a large presence in the freedom-struggle paper. The <b>Kunihar Praja Mandal</b>, formed in 1939, extracted a written agreement from <b>Rana Hardev Singh on 9 July 1939</b> — days before the Dhami firing — making it one of the first successful constitutional agitations in the hills."],
  ["p","An earlier agitation of <b>1920</b> under <b>Gauri Shankar</b> and <b>Baba Kanshi Ram</b> had already made Kunihar a centre of protest."]
 ], rel:["d-solan","ev-kunihar","ev-dhami","p-kanshiram","ev-prajamandal"]},

{id:"s-dhami", name:"Dhami", seat:"dhami", capital:"Halog (Dhami)", founder:"An offshoot of the Kahlur house (tradition)",
 founded:"c. 1815 as a separate sanad state", dynasty:"Rana", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Rana Dalip Singh — ruler at the time of the 1939 firing"],
 blocks:[
  ["p","A very small state near Shimla, remembered for one day: <b>16 July 1939</b>, when the Rana's men fired on a Praja Mandal crowd at <b>Halog</b>, killing <b>Durga Das (Uma Dutt by some accounts)</b> — the <b>first firing on a popular movement in the Himachal hills</b>."],
  ["p","The immediate cause was the ban on the <b>Dhami Prem Prachani Sabha</b> and the arrest of <b>Bhagmal Sautha</b>, who was leading a procession to present demands to the Rana."]
 ], rel:["ev-dhami","p-bhagmalsautha","d-shimla","ev-prajamandal"]},

{id:"s-jaswan", name:"Jaswan", seat:"jaswan", capital:"Rajpura", founder:"Purab Chand",
 founded:"1170", dynasty:"Katoch (a branch of Kangra)", group:"Punjab Hill States", merged:"Annexed by the British, 1849",
 rulers:["Purab Chand — founder","Umed Singh — the last raja, pensioned after 1849"],
 blocks:[["p","A Katoch offshoot founded in <b>1170 by Purab Chand</b>, holding the Jaswan Dun between the Shivaliks and the Sola Singhi range. Annexed after the Second Anglo-Sikh War; its territory is now in Una district."]]
 , rel:["s-kangra","d-una"]},

{id:"s-siba", name:"Siba", seat:"siba", capital:"Siba", founder:"Sibaran Chand",
 founded:"c. 1450", dynasty:"Katoch (a branch of Guler)", group:"Punjab Hill States", merged:"Annexed by the British, 1849",
 rulers:["Sibaran Chand — founder","Gobind Singh"],
 blocks:[["p","A small Katoch state founded by <b>Sibaran Chand</b>, a son of the Guler house. Its fort above the Beas was taken by Ranjit Singh and the state annexed by the British after 1849."]]
 , rel:["s-guler","d-kangra"]},

{id:"s-datarpur", name:"Datarpur", seat:"datarpur", capital:"Datarpur", founder:"Datar Chand",
 founded:"c. 1550", dynasty:"Katoch (a branch of Siba)", group:"Punjab Hill States", merged:"Annexed by the British, 1849",
 rulers:["Datar Chand — founder","Jagat Chand — the last ruler, deposed in 1849"],
 blocks:[["p","The youngest of the Katoch offshoots, founded by <b>Datar Chand</b>. Annexed in 1849 for the ruler's part in the Second Anglo-Sikh War."]]
 , rel:["s-siba","d-una"]},

{id:"s-kutlehr", name:"Kutlehr", seat:"kutlehr", capital:"Kutlehr", founder:"Kutlehria Rajputs",
 founded:"ancient", dynasty:"Kutlehria", group:"Punjab Hill States", merged:"Feudatory, absorbed after 1846",
 rulers:["Narain Pal","Ram Pal"],
 blocks:[["p","An old and stubbornly independent small state between the Beas and the Sola Singhi range, subdued in turn by Sansar Chand, Ranjit Singh and the British. Its territory lies in Una and Hamirpur districts."]]
 , rel:["p-sansarchand","d-una","d-hamirpur"]},

{id:"s-bhajji", name:"Bhajji", seat:"bhajji", capital:"Sunni", founder:"A branch of the Keonthal house",
 founded:"medieval", dynasty:"Rana", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Rana Ram Chand","Rana Durga Singh"],
 blocks:[["p","A Simla Hill State on the Sutlej at <b>Sunni</b>. With Keonthal it supplied the land on which Shimla station was built, and its ferry at Sunni carried the trade route to Bushahr."]]
 , rel:["s-keonthal","d-shimla","t-british-shimla"]},

{id:"s-kumharsain", name:"Kumharsain", seat:"kumharsain", capital:"Kumharsain", founder:"Kirat Singh (tradition)",
 founded:"c. 11th century", dynasty:"Rajput", group:"Simla Hill States", merged:"15 April 1948",
 rulers:["Rana Hira Singh","Rana Vidya Dhar Singh"],
 blocks:[["p","A Simla Hill State on the road to Bushahr, holding the Sutlej crossing at Nirath. It was one of the states that resisted Gorkha demands and later joined the Himalayan Hill States Regional Council."]]
 , rel:["d-shimla","ev-hhsrc","s-bushahr"]}
];

