/* ============================================================
   FEATURES — one record per peak, pass, lake and glacier drawn
   on the map. `pid` matches the key in MAP.places, so geometry
   and record are the same entity seen two ways, exactly as
   rivers are. Prose depth matches D.rivers: two or three
   paragraphs and one exam hook.
   ============================================================ */
D.features = [

/* ---------- PASSES ---------- */
{id:"ps-shipkila", k:"pass", pid:"shipkila", name:"Shipki La",
 alt:"3,930 m", range:"Zanskar range",
 connects:"Kinnaur (Himachal Pradesh) ⇄ Tibet (China)",
 status:"Motorable; a designated India–China border-trade point",
 route:"Namgia — Khab — the Sutlej gorge",
 districts:["d-kinnaur"],
 blocks:[
  ["p","The pass that answers two questions at once. It is a <b>trade route</b> — one of the three designated India–China border-trade points, alongside Nathu La in Sikkim and Lipulekh in Uttarakhand — and it is a <b>river gate</b>: the <b>Sutlej enters India here</b>, having risen at Rakas Tal in Tibet."],
  ["p","The first Indian village below the pass is <b>Namgia</b>, and a few kilometres downstream at <b>Khab</b> the Spiti river joins the Sutlej. Candidates who remember only the height miss the point of the pass; what is asked is the combination — Kinnaur, Tibet, the Sutlej, and trade."],
  ["note","Exam hook","3,930 m · Zanskar range · Kinnaur to Tibet · the <b>Sutlej enters India here</b> · a designated border-trade point · first village Namgia · Spiti joins the Sutlej just below, at Khab."]],
 rel:["t-passes","Sutlej","d-kinnaur"]},

{id:"ps-rohtang", k:"pass", pid:"rohtang", name:"Rohtang La",
 alt:"3,978 m", range:"Pir Panjal",
 connects:"Kullu ⇄ Lahaul",
 status:"Historically the only link into Lahaul; now largely bypassed by the Atal Tunnel",
 route:"Kullu valley — Rohtang — the Chandra valley of Lahaul",
 districts:["d-kullu","d-lahaul"],
 blocks:[
  ["p","At <b>3,978 m</b> in the <b>Pir Panjal</b>, Rohtang La is the historic gateway between the Kullu valley and Lahaul. Below it, at <b>Beas Kund</b>, the Beas itself rises — so the pass sits at the head of Himachal's own river as well as at the head of the road to Lahaul."],
  ["p","For most of its history Rohtang was the only link into Lahaul, closed by snow for a large part of the year. It is now bypassed by the <b>Atal Tunnel</b> — <b>9.02 km</b> long, opened on <b>3 October 2020</b> — which keeps Lahaul connected through the winter for the first time."],
  ["note","Exam hook","3,978 m · Pir Panjal · Kullu to Lahaul · Beas rises just below it, at Beas Kund · bypassed by the Atal Tunnel, 9.02 km, opened 3 October 2020."]],
 rel:["t-passes","Beas","d-kullu","d-lahaul"]},

{id:"ps-kunzum", k:"pass", pid:"kunzum", name:"Kunzum La",
 alt:"4,551 m", range:"Kunzum range (Great Himalaya)",
 connects:"Lahaul (Chandra valley) ⇄ Spiti",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"The Chandra valley (Lahaul) — Kunzum La — Spiti",
 districts:["d-lahaul"],
 blocks:[
  ["p","Kunzum La, <b>4,551 m</b>, carries the road from the <b>Chandra valley of Lahaul</b> into <b>Spiti</b> — the crossing that marks the entry into the cold desert proper. It sits in the Kunzum range, a spur of the Great Himalaya."],
  ["p","<b>Chandra Tal</b>, the source lake of the Chandra and one of the state's three Ramsar sites, lies just off the pass, which is why Kunzum is the standard answer to 'which pass is nearest Chandra Tal'."],
  ["note","Exam hook","4,551 m · Kunzum range (Great Himalaya) · Lahaul (Chandra valley) to Spiti · gateway to Spiti · Chandra Tal lies just off it."]],
 rel:["t-passes","t-lakes","Spiti","d-lahaul"]},

{id:"ps-baralacha", k:"pass", pid:"baralacha", name:"Baralacha La",
 alt:"4,890 m", range:"Zanskar range",
 connects:"Lahaul ⇄ Ladakh",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Lahaul — Baralacha La — Ladakh",
 districts:["d-lahaul"],
 blocks:[
  ["p","Baralacha La, <b>4,890 m</b> in the <b>Zanskar range</b>, is the watershed pass between Lahaul and Ladakh, and the one place in the roster where two separate river stories begin on either side of the same saddle: the <b>Chandra rises</b> to its south near Chandra Tal, and the <b>Bhaga</b> to its north at Suraj Tal — the two run apart for a hundred-odd kilometres each before meeting again at Tandi to form the Chenab."],
  ["p","<b>Suraj Tal</b> itself, one of the highest lakes in India, sits right below the pass on the Bhaga side."],
  ["note","Exam hook","4,890 m · Zanskar range · Lahaul to Ladakh · Chandra rises near Chandra Tal (south side), Bhaga at Suraj Tal (north side) · both meet at Tandi to form the Chenab."]],
 rel:["t-passes","Chandra","Bhaga","t-lakes","d-lahaul"]},

{id:"ps-sach", k:"pass", pid:"sach", name:"Sach Pass",
 alt:"4,420 m", range:"Pir Panjal",
 connects:"Chamba ⇄ Pangi",
 status:"Snowbound most of the year — the Pangi valley's lifeline when it is open",
 route:"Chamba — Sach Pass — Pangi",
 districts:["d-chamba"],
 blocks:[
  ["p","Sach Pass, <b>4,420 m</b> in the <b>Pir Panjal</b>, is the link between Chamba town and the <b>Pangi valley</b> — one of the most isolated tracts in the state, home to the <b>Pangwala</b> tribe."],
  ["p","It is <b>snowbound most of the year</b>, which cuts Pangi off from the rest of Chamba for that stretch. In the months it is open, it is the Pangi valley's lifeline."],
  ["note","Exam hook","4,420 m · Pir Panjal · Chamba to Pangi · Pangi is the most isolated tract in the state, home to the Pangwala · snowbound most of the year."]],
 rel:["t-passes","t-tribes","d-chamba"]},

{id:"ps-jalori", k:"pass", pid:"jalori", name:"Jalori Pass",
 alt:"3,120 m", range:"Outer Seraj",
 connects:"Kullu ⇄ Shimla",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Kullu (Outer Seraj) — Jalori — Shimla district",
 districts:["d-kullu","d-shimla"],
 blocks:[
  ["p","Jalori Pass, <b>3,120 m</b>, is the <b>lowest of the named passes</b> in this roster, carrying the road across the <b>Outer Seraj</b> tract between Kullu and Shimla district."],
  ["p","<b>Sareolsar lake</b> lies just below the pass, and the old <b>Raghupur fort</b> stands above it."],
  ["note","Exam hook","3,120 m · Outer Seraj · Kullu to Shimla · lowest named pass in the roster · Sareolsar lake and Raghupur fort nearby."]],
 rel:["t-passes","t-lakes","d-kullu","d-shimla"]},

{id:"ps-hamta", k:"pass", pid:"hamta", name:"Hamta Pass",
 alt:"4,270 m", range:"Pir Panjal",
 connects:"Kullu ⇄ Lahaul",
 status:"A trekking pass, not motorable — the classic crossing beside Rohtang",
 route:"Kullu — Hamta — Lahaul",
 districts:["d-kullu","d-lahaul"],
 blocks:[
  ["p","Hamta Pass, <b>4,270 m</b> in the <b>Pir Panjal</b>, runs beside Rohtang and is the <b>classic trekking crossing</b> between Kullu and Lahaul — walked rather than driven, unlike its more famous neighbour."],
  ["p","Because it sits so close to Rohtang in both height and direction, questions often pair the two, asking candidates to tell apart the motorable and the trekking crossing of the same stretch of the Pir Panjal."],
  ["note","Exam hook","4,270 m · Pir Panjal · Kullu to Lahaul · the classic trekking crossing beside Rohtang."]],
 rel:["t-passes","d-kullu","d-lahaul"]},

{id:"ps-chanshal", k:"pass", pid:"chanshal", name:"Chanshal Pass",
 alt:"4,520 m", range:"Great Himalaya",
 connects:"Rohru ⇄ Dodra Kwar, Shimla",
 status:"Motorable; the highest motorable pass in Shimla district",
 route:"Rohru — Chanshal — Dodra Kwar",
 districts:["d-shimla"],
 blocks:[
  ["p","Chanshal Pass, <b>4,520 m</b> in the <b>Great Himalaya</b>, carries the road from <b>Rohru</b> towards <b>Dodra Kwar</b> in Shimla district, and is the <b>highest motorable pass in Shimla district</b>."],
  ["p","Dodra Kwar is among the more remote pockets of Shimla district that the pass opens up in the months it stays clear of snow."],
  ["note","Exam hook","4,520 m · Great Himalaya · Rohru to Dodra Kwar, Shimla · highest motorable pass in Shimla district."]],
 rel:["t-passes","d-shimla"]},

{id:"ps-kugti", k:"pass", pid:"kugti", name:"Kugti Pass",
 alt:"5,040 m", range:"Pir Panjal",
 connects:"Bharmour (Chamba) ⇄ Lahaul",
 status:"Traditionally a shepherd and trekking route — the Gaddi migration crossing",
 route:"Bharmour (Chamba) — Kugti — Lahaul",
 districts:["d-chamba","d-lahaul"],
 blocks:[
  ["p","Kugti Pass, <b>5,040 m</b> in the <b>Pir Panjal</b>, links <b>Bharmour</b> in Chamba to Lahaul, and is best known as the <b>traditional Gaddi migration route</b>: the shepherds of Bharmour cross it, along with the Jalsu Pass, with their flocks each summer on the way to Lahaul's high pastures."],
  ["p","The <b>Gaddi</b> are transhumant shepherds of Bharmour and Kangra, devotees of Shiva, recognisable by the <i>chola</i> and the <i>dora</i>, the long woollen rope belt."],
  ["note","Exam hook","5,040 m · Pir Panjal · Bharmour (Chamba) to Lahaul · the traditional Gaddi migration route, alongside Jalsu Pass."]],
 rel:["t-passes","t-tribes","d-chamba","d-lahaul"]},

{id:"ps-pinparvati", k:"pass", pid:"pinparvati", name:"Pin Parvati Pass",
 alt:"5,319 m", range:"Great Himalaya",
 connects:"Kullu (Parvati) ⇄ Spiti (Pin)",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Parvati valley (Kullu) — Pin Parvati — Pin valley (Spiti)",
 districts:["d-kullu","d-lahaul"],
 blocks:[
  ["p","Pin Parvati Pass, <b>5,319 m</b> in the <b>Great Himalaya</b>, links two river valleys rather than two towns — the <b>Parvati</b>, in Kullu, and the <b>Pin</b>, in Spiti. The Parvati joins the Beas at Bhuntar and the Spiti (which the Pin feeds) joins the Sutlej at Khab, so crossing this pass means crossing from the Beas system to the Sutlej system."],
  ["p","The Parvati rises at the <b>Mantalai glacier</b> above the pass; the Pin gives its name to the <b>Pin Valley National Park</b> on the far side."],
  ["note","Exam hook","5,319 m · Great Himalaya · Kullu (Parvati) to Spiti (Pin) · links the Parvati and Pin valleys — two separate river basins."]],
 rel:["t-passes","Parvati","Spiti","d-kullu","d-lahaul"]},

{id:"ps-parangla", k:"pass", pid:"parangla", name:"Parang La",
 alt:"5,578 m", range:"—",
 connects:"Spiti ⇄ Ladakh (Tso Moriri)",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year — the highest in the roster",
 route:"Spiti — Parang La — Ladakh, towards Tso Moriri",
 districts:["d-lahaul"],
 blocks:[
  ["p","Parang La, <b>5,578 m</b>, is the <b>highest pass in the standard list</b> for this exam — higher than Pin Parvati, Kugti, or any of the Dhauladhar crossings. It links Spiti to Ladakh, descending on the far side towards Tso Moriri."],
  ["p","It carries no named range in the standard roster, so height and the Spiti–Ladakh link are what identify it in a question."],
  ["note","Exam hook","5,578 m · Spiti to Ladakh (Tso Moriri) · the highest pass in the standard list."]],
 rel:["t-passes","d-lahaul"]},

{id:"ps-shinkula", k:"pass", pid:"darcha", name:"Shinku La (Shingo La)",
 alt:"5,090 m", range:"Great Himalaya",
 connects:"Lahaul ⇄ Zanskar",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Darcha (Lahaul) — Shinku La — Padum (Zanskar)",
 districts:["d-lahaul"],
 blocks:[
  ["p","Shinku La, also called <b>Shingo La</b>, <b>5,090 m</b> in the <b>Great Himalaya</b>, carries the route from Lahaul into Zanskar — the <b>Darcha–Padum</b> crossing."],
  ["p","It continues the roster's pattern of Lahaul as the hub most trans-Himalayan passes in this list radiate from — Baralacha to Ladakh, Kunzum and Parang La to Spiti and beyond, and Shinku La to Zanskar."],
  ["note","Exam hook","5,090 m · Great Himalaya · Lahaul to Zanskar · the Darcha–Padum route."]],
 rel:["t-passes","d-lahaul"]},

{id:"ps-bhubujot", k:"pass", pid:"bhubujot", name:"Bhubu Jot",
 alt:"2,900 m", range:"Dhauladhar",
 connects:"Mandi ⇄ Kullu",
 status:"An internal pass, the old Mandi–Kullu foot route",
 route:"Mandi — Bhubu Jot — Kullu",
 districts:["d-mandi","d-kullu"],
 blocks:[
  ["p","Bhubu Jot, <b>2,900 m</b> in the <b>Dhauladhar</b>, is an <b>internal pass</b> — it connects Mandi and Kullu districts rather than Himachal to a neighbouring region, and was the old foot route between the two before the modern road took over."],
  ["note","Exam hook","2,900 m · Dhauladhar · Mandi to Kullu · an internal pass, the old Mandi–Kullu foot route."]],
 rel:["t-passes","d-mandi","d-kullu"]},

{id:"ps-indrahar", k:"pass", pid:"indrahar", name:"Indrahar Pass",
 alt:"4,342 m", range:"Dhauladhar",
 connects:"Kangra (McLeodganj) ⇄ Chamba (Bharmour)",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Kangra (McLeodganj) — Indrahar — Chamba (Bharmour)",
 districts:["d-kangra","d-chamba"],
 blocks:[
  ["p","Indrahar Pass, <b>4,342 m</b>, is the <b>Dhauladhar crossing above Dharamshala</b> and McLeodganj in Kangra, leading over to <b>Bharmour</b> in Chamba — the same Bharmour that is the Gaddi homeland."],
  ["p","It is the direct Dhauladhar crossing between the Kangra valley and Bharmour, distinct from the longer Kugti route further along the same range."],
  ["note","Exam hook","4,342 m · Dhauladhar · Kangra (McLeodganj) to Chamba (Bharmour) · the Dhauladhar crossing above Dharamshala."]],
 rel:["t-passes","t-tribes","d-kangra","d-chamba"]},

{id:"ps-padri", k:"pass", pid:"padri", name:"Padri Pass",
 alt:"3,300 m", range:"—",
 connects:"Chamba ⇄ Bhaderwah (Jammu)",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Chamba — Padri — Bhaderwah (Jammu)",
 districts:["d-chamba"],
 blocks:[
  ["p","Padri Pass, <b>3,300 m</b>, is Chamba's link southward rather than into Lahaul or Pangi — it connects Chamba to <b>Bhaderwah</b>, across the state boundary in Jammu."],
  ["note","Exam hook","3,300 m · Chamba to Bhaderwah (Jammu) · the Chamba–Jammu link."]],
 rel:["t-passes","d-chamba"]},

{id:"ps-chobia", k:"pass", pid:"chobia", name:"Chobia Pass",
 alt:"4,966 m", range:"Pir Panjal",
 connects:"Chamba ⇄ Lahaul",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Chamba — Chobia — Lahaul",
 districts:["d-chamba","d-lahaul"],
 blocks:[
  ["p","Chobia Pass, <b>4,966 m</b> in the <b>Pir Panjal</b>, is one of a group of three passes out of Chamba into Lahaul — <b>Drati, Kalicho and Chobia</b> — that are usually listed together rather than asked about individually."],
  ["note","Exam hook","4,966 m · Pir Panjal · Chamba to Lahaul · one of the Drati–Kalicho–Chobia group."]],
 rel:["t-passes","d-chamba","d-lahaul"]},

{id:"ps-thamsar", k:"pass", pid:"thamsar", name:"Thamsar Pass",
 alt:"4,572 m", range:"Dhauladhar",
 connects:"Bara Bhangal ⇄ Bara Bangahal, Kangra",
 status:"A seasonal Himalayan crossing, closed under snow for much of the year",
 route:"Bara Bhangal — Thamsar — Bara Bangahal (Kangra)",
 districts:["d-kangra"],
 blocks:[
  ["p","Thamsar Pass, <b>4,572 m</b> in the <b>Dhauladhar</b>, is the route into the headwaters of the <b>Ravi</b> — it leads from Bara Bhangal towards <b>Bara Bangahal</b> in Kangra, the same Bara Bangahal where the Bhadal and the Tantgari meet to form the Ravi itself."],
  ["note","Exam hook","4,572 m · Dhauladhar · Bara Bhangal to Bara Bangahal, Kangra · the route into the Ravi's headwaters."]],
 rel:["t-passes","Ravi","d-kangra"]},

{id:"ps-bashleo", k:"pass", pid:"bashleo", name:"Bashleo Pass",
 alt:"3,300 m", range:"—",
 connects:"Mandi/Kullu ⇄ Shimla (Seraj)",
 status:"An internal Seraj crossing",
 route:"Mandi/Kullu (Seraj) — Bashleo — Shimla district",
 districts:["d-mandi","d-kullu","d-shimla"],
 blocks:[
  ["p","Bashleo Pass, <b>3,300 m</b>, is another <b>internal crossing</b>, linking the Mandi/Kullu side of the Seraj tract to Shimla district — a lower-profile counterpart to Jalori a little further along the same range."],
  ["note","Exam hook","3,300 m · Mandi/Kullu to Shimla (Seraj) · an internal Seraj crossing."]],
 rel:["t-passes","d-mandi","d-kullu","d-shimla"]},

/* ---------- PEAKS ---------- */

{id:"pk-reopurgyil", k:"peak", pid:"reopurgyil", name:"Reo Purgyil",
 alt:"6,816 m", range:"Zanskar range", alias:"Leo Pargial, Reo Purgyal",
 fame:"The highest point in Himachal Pradesh",
 districts:["d-kinnaur"],
 blocks:[
  ["p","The <b>highest mountain in Himachal Pradesh</b> at <b>6,816 m</b>, standing on the <b>Kinnaur border with Tibet</b> at the southern end of the Zanskar range. It rises directly above the Sutlej where the river has just entered India, so the state's highest point and its principal river gate are within sight of each other."],
  ["p","The massif has twin summits and is the culminating point of the ridge dividing the Spiti and Sutlej drainages. It was first climbed by an Indo-Tibetan Border Police team, and remains an inner-line area requiring a permit."],
  ["note","Exam hook","<b>6,816 m — the highest peak in Himachal Pradesh</b> · Kinnaur · Zanskar range · on the Tibet border · also spelt Leo Pargial."]],
 rel:["t-peaks","d-kinnaur","Sutlej","ps-shipkila"]},

{id:"pk-shigriparbat", k:"peak", pid:"shigriparbat", name:"Shigri Parbat",
 alt:"6,526 m", range:"Great Himalayan range",
 fame:"Rises above the Bara Shigri glacier, the largest in Himachal Pradesh",
 districts:["d-lahaul"],
 blocks:[
  ["p","Shigri Parbat, <b>6,526 m</b>, stands in the <b>Great Himalayan range</b> in Lahaul, rising directly above the <b>Bara Shigri glacier</b> — the <b>largest glacier in Himachal Pradesh</b>, whose melt the Chandra collects on its way down the Lahaul valley."],
  ["p","It is one of two Great Himalayan range peaks in this roster, alongside Kinner Kailash across in Kinnaur; the rest of the twelve belong to the Zanskar, Pir Panjal or Dhauladhar instead."],
  ["note","Exam hook","6,526 m · Great Himalayan range · Lahaul · above the Bara Shigri glacier, HP's largest."]],
 rel:["t-peaks","d-lahaul","Chandra"]},

{id:"pk-mulkila", k:"peak", pid:"mulkila", name:"Mulkila",
 alt:"6,517 m",
 fame:"The Mulkila massif above the Miyar–Chandra divide",
 districts:["d-lahaul"],
 blocks:[
  ["p","Mulkila, <b>6,517 m</b>, is the high point of the <b>Mulkila massif</b> in Lahaul, standing on the divide between the <b>Miyar</b> glacier valley and the <b>Chandra</b> valley."],
  ["p","It is part of the same tight cluster of glaciated six-thousanders as Shigri Parbat, Dharmsura and Gepang Goh, all within Lahaul — the district that carries the largest share of the state's highest peaks after Kinnaur's Reo Purgyil."],
  ["note","Exam hook","6,517 m · Mulkila massif · Lahaul · on the Miyar–Chandra divide."]],
 rel:["t-peaks","d-lahaul","Chandra"]},

{id:"pk-dharmsura", k:"peak", pid:"dharmsura", name:"Dharmsura (White Sail)",
 alt:"6,446 m", alias:"White Sail",
 fame:"Climbed from the Tos glacier",
 districts:["d-lahaul","d-kullu"],
 blocks:[
  ["p","Dharmsura, <b>6,446 m</b>, also called <b>White Sail</b>, sits on the Lahaul–Kullu boundary and is usually climbed from the <b>Tos glacier</b>."],
  ["p","It ranks just below Mulkila in this roster and, like Shigri Parbat and Mulkila, belongs to the high glaciated country shared by upper Lahaul and Kullu rather than to the outer, lower ranges."],
  ["note","Exam hook","6,446 m · Lahaul/Kullu · also called White Sail · climbed from the Tos glacier."]],
 rel:["t-peaks","d-lahaul","d-kullu"]},

{id:"pk-indrasan", k:"peak", pid:"indrasan", name:"Indrasan",
 alt:"6,221 m", range:"Pir Panjal",
 fame:"The highest peak of the Pir Panjal's eastern group",
 districts:["d-kullu"],
 blocks:[
  ["p","Indrasan, <b>6,221 m</b> in Kullu, is the <b>highest peak of the Pir Panjal's eastern group</b> — the range that separates Kullu and Chamba from Lahaul, crossed at Rohtang, Kugti, Sach and Hamta."],
  ["p","It stands beside <b>Deo Tibba</b>, the dome-shaped peak above Manali; the two are named together in this roster as the signature summits of the Kullu Pir Panjal."],
  ["note","Exam hook","6,221 m · Pir Panjal · Kullu · the highest peak of the Pir Panjal's eastern group."]],
 rel:["t-peaks","d-kullu","pk-deotibba"]},

{id:"pk-shilla", k:"peak", pid:"shilla", name:"Shilla",
 alt:"6,132 m", range:"Zanskar range",
 fame:"Long, but wrongly, claimed as the highest surveyed peak in India",
 districts:["d-kinnaur","d-lahaul"],
 blocks:[
  ["p","Shilla, <b>6,132 m</b> on the Kinnaur–Spiti border, belongs to the same <b>Zanskar range</b> as Reo Purgyil, the range that separates Spiti and upper Kinnaur from Tibet."],
  ["p","It was long claimed to be the highest surveyed peak in India — a claim later found to be mistaken, so it should never be cited as such. The state's actual highest point is Reo Purgyil."],
  ["note","Exam hook","6,132 m · Zanskar range · Kinnaur/Spiti · once wrongly claimed as India's highest surveyed peak."]],
 rel:["t-peaks","d-kinnaur","d-lahaul","pk-reopurgyil"]},

{id:"pk-kinnerkailash", k:"peak", pid:"kinnerkailash", name:"Kinner Kailash",
 alt:"6,050 m", range:"Great Himalayan range",
 fame:"The 79-foot rock Shivling; the Kinner Kailash parikrama",
 districts:["d-kinnaur"],
 blocks:[
  ["p","Kinner Kailash, <b>6,050 m</b> in Kinnaur, is in the <b>Great Himalayan range</b> and carries a <b>79-foot rock formation worshipped as a Shivling</b> near its summit."],
  ["p","It is circumambulated on the <b>Kinner Kailash parikrama</b>, one of the district's pilgrimage circuits, and is one of two Great Himalayan range peaks in this roster alongside Shigri Parbat."],
  ["note","Exam hook","6,050 m · Great Himalayan range · Kinnaur · the 79-foot rock Shivling; the Kinner Kailash parikrama."]],
 rel:["t-peaks","d-kinnaur"]},

{id:"pk-deotibba", k:"peak", pid:"deotibba", name:"Deo Tibba",
 alt:"6,001 m", range:"Pir Panjal",
 fame:"The dome-shaped peak above Manali, beside Indrasan",
 districts:["d-kullu"],
 blocks:[
  ["p","Deo Tibba, <b>6,001 m</b>, is the dome-shaped peak that rises above <b>Manali</b> in Kullu, standing beside <b>Indrasan</b> in the same Pir Panjal group."],
  ["p","Indrasan and Deo Tibba are the two Pir Panjal peaks named in this roster — the range that also carries the Rohtang, Kugti, Sach and Hamta crossings."],
  ["note","Exam hook","6,001 m · Pir Panjal · Kullu · the dome above Manali, beside Indrasan."]],
 rel:["t-peaks","d-kullu","pk-indrasan"]},

{id:"pk-hanumantibba", k:"peak", pid:"hanumantibba", name:"Hanuman Tibba",
 alt:"5,928 m", range:"Dhauladhar",
 fame:"The highest peak of the Dhauladhar",
 districts:["d-kullu","d-kangra"],
 blocks:[
  ["p","Hanuman Tibba, <b>5,928 m</b>, is the <b>highest peak of the Dhauladhar</b>, standing on the Kullu–Kangra section of the range."],
  ["p","The Dhauladhar is the wall that stands behind Kangra, crossed further along at Indrahar and Thamsar; Hanuman Tibba is its culminating point rather than one of those crossings."],
  ["note","Exam hook","5,928 m · Dhauladhar · Kullu/Kangra · the highest peak of the Dhauladhar."]],
 rel:["t-peaks","d-kullu","d-kangra","ps-indrahar"]},

{id:"pk-gepanggoh", k:"peak", pid:"gepanggoh", name:"Gepang Goh",
 alt:"5,870 m",
 fame:"The guardian deity peak of Lahaul",
 districts:["d-lahaul"],
 blocks:[
  ["p","Gepang Goh, <b>5,870 m</b>, is regarded in Lahaul as the <b>guardian deity peak</b> of the valley, with <b>Gepang Gath lake</b> lying below it."],
  ["p","It stands among the district's cluster of glaciated peaks — Shigri Parbat, Mulkila and Dharmsura — that give Lahaul its share of six-thousanders in this roster."],
  ["note","Exam hook","5,870 m · Lahaul · the guardian deity peak of Lahaul; Gepang Gath lake below."]],
 rel:["t-peaks","d-lahaul"]},

{id:"pk-manimaheshkailash", k:"peak", pid:"manimaheshkailash", name:"Manimahesh Kailash",
 alt:"5,653 m",
 fame:"Above Manimahesh lake; the yatra peak, never climbed",
 districts:["d-chamba"],
 blocks:[
  ["p","Manimahesh Kailash, <b>5,653 m</b> in Chamba, rises directly above <b>Manimahesh lake</b>, the site of the Manimahesh yatra."],
  ["p","It is held sacred and, unlike the state's other high peaks in this roster, has never been climbed — the mountain itself, not only the lake below it, is the object of pilgrimage."],
  ["note","Exam hook","5,653 m · Chamba · above Manimahesh lake · the yatra peak, never climbed."]],
 rel:["t-peaks","d-chamba"]},

{id:"pk-chaudhar", k:"peak", pid:"chaudhar", name:"Churdhar",
 alt:"3,647 m", range:"Shivalik (Outer Himalaya)",
 fame:"The highest peak of the outer Himalaya in Himachal Pradesh",
 districts:["d-sirmaur"],
 blocks:[
  ["p","Churdhar, <b>3,647 m</b> in Sirmaur, is the <b>highest peak of the outer Himalaya in Himachal Pradesh</b> — the Shivalik zone along the state's southern fringe, far lower than the Zanskar, Great Himalayan, Pir Panjal or Dhauladhar peaks in this roster."],
  ["p","It carries a temple to <b>Shirgul Devta</b> at its summit, and is the lowest peak in this list by a wide margin, standing under 3,700 m against a state high of 6,816 m at Reo Purgyil."],
  ["note","Exam hook","3,647 m · Shivalik (Outer Himalaya) · Sirmaur · the highest peak of the outer Himalaya in HP; Shirgul Devta temple."]],
 rel:["t-peaks","d-sirmaur","pk-reopurgyil"]}

];
