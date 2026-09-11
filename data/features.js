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
 rel:["t-peaks","d-sirmaur","pk-reopurgyil"]},

/* ---------- LAKES ---------- */
{id:"lk-renuka", k:"lake", pid:"renuka", name:"Renuka Lake",
 type:"Natural",
 sacred:"Renuka and the sage Parshuram — the Renukaji fair",
 ramsar:"Ramsar site, 2005",
 districts:["d-sirmaur"],
 blocks:[
  ["p","Renuka, in Sirmaur, is the <b>largest natural lake in Himachal Pradesh</b> — the one fact about this roster every candidate must have cold. Seen from above it is said to trace the outline of a <b>reclining woman</b>, and the lake is identified with Renuka herself, mother of the sage Parshuram."],
  ["p","It draws the <b>Renukaji fair every November</b>, when the meeting of Renuka and Parshuram is re-enacted at the water's edge, and it was designated a <b>Ramsar site in 2005</b> — one of only three the state holds."],
  ["note","Exam hook","Sirmaur · <b>largest natural lake in HP</b> · shaped like a reclining woman · Renukaji fair, November · <b>Ramsar 2005</b>."]],
 rel:["t-lakes","t-fairs","d-sirmaur"]},

{id:"lk-rewalsar", k:"lake", pid:"rewalsar", name:"Rewalsar (Tso Pema)",
 type:"Natural",
 sacred:"Hindus, Buddhists and Sikhs alike",
 districts:["d-mandi"],
 blocks:[
  ["p","Rewalsar, in Mandi, is unusual among the state's lakes for being held sacred by <b>three faiths at once</b> — Hindus, Buddhists and Sikhs. Its Buddhist name, <b>Tso Pema</b>, ties it to <b>Padmasambhava</b>, who is said to have left from here for Tibet."],
  ["p","The lake carries <b>floating islands</b> of vegetation, and it is counted, together with Paonta Sahib, among the state's <b>principal Sikh sites</b>."],
  ["note","Exam hook","Mandi · Tso Pema · sacred to Hindus, Buddhists and Sikhs · Padmasambhava's departure point for Tibet · floating islands."]],
 rel:["t-lakes","t-monasteries","t-shaktipeeth","d-mandi"]},

{id:"lk-prashar", k:"lake", pid:"prashar", name:"Prashar Lake",
 type:"Natural",
 alt:"2,730 m",
 sacred:"The sage Prashar",
 districts:["d-mandi"],
 blocks:[
  ["p","Prashar, at <b>2,730 m</b> in Mandi, is known for the <b>three-tiered pagoda-style temple</b> standing on its bank, dedicated to the sage Prashar."],
  ["p","The lake also carries a small <b>floating island</b> on its surface — a detail that, with the pagoda temple, is the pair of facts any question on Prashar is built around."],
  ["note","Exam hook","Mandi · 2,730 m · three-tiered pagoda temple · floating island."]],
 rel:["t-lakes","d-mandi"]},

{id:"lk-kamrunag", k:"lake", pid:"kamrunag", name:"Kamrunag Lake",
 type:"Natural",
 sacred:"Kamru Nag",
 districts:["d-mandi"],
 blocks:[
  ["p","Kamrunag, in Mandi, is a small high-altitude lake associated with the deity <b>Kamru Nag</b>, worshipped across the district."],
  ["p","Devotees cast <b>offerings of gold into the water</b> rather than leaving them at a shrine — the distinctive practice that identifies this lake in any question."],
  ["note","Exam hook","Mandi · devotees cast offerings of gold into the lake, to Kamru Nag."]],
 rel:["t-lakes","d-mandi"]},

{id:"lk-sareolsar", k:"lake", pid:"sareolsar", name:"Sareolsar Lake",
 type:"Natural",
 sacred:"Budhi Nagin",
 districts:["d-kullu"],
 blocks:[
  ["p","Sareolsar lies in Kullu, above the <b>Jalori Pass</b>, and is dedicated to <b>Budhi Nagin</b>, whose temple stands by the water."],
  ["p","It is the one of the district's high lakes in this roster named for a temple rather than for the peak or pass nearest it, unlike Bhrigu and Dashair."],
  ["note","Exam hook","Kullu, above Jalori Pass · Budhi Nagin temple."]],
 rel:["t-lakes","d-kullu","ps-jalori"]},

{id:"lk-chandratal", k:"lake", pid:"chandratal", name:"Chandra Tal",
 type:"Natural",
 alt:"about 4,300 m",
 river:"Chandra — rises here",
 ramsar:"Ramsar site, 2005",
 districts:["d-lahaul"],
 blocks:[
  ["p","Chandra Tal, <b>about 4,300 m</b> in Lahaul, is the <b>source of the Chandra</b>, the eastern headwater of the Chenab, and lies just off <b>Kunzum La</b>, the pass between the Chandra valley and Spiti."],
  ["p","It was designated a <b>Ramsar site in 2005</b> — one of the state's three, with Renuka and Pong — and is paired in this roster with Suraj Tal, on the far side of Baralacha La, as the source lakes of the Chandra and the Bhaga."],
  ["note","Exam hook","Lahaul · ~4,300 m · source of the Chandra · just off Kunzum La · <b>Ramsar 2005</b>."]],
 rel:["t-lakes","Chandra","ps-kunzum","d-lahaul"]},

{id:"lk-surajtal", k:"lake", pid:"surajtal", name:"Suraj Tal",
 type:"Natural",
 river:"Bhaga — rises here",
 districts:["d-lahaul"],
 blocks:[
  ["p","Suraj Tal sits just below <b>Baralacha La</b> on its Lahaul side and is the <b>source of the Bhaga</b>, the western headwater of the Chenab — the counterpart, on the opposite side of the same pass, to Chandra Tal and the Chandra."],
  ["p","It is counted among the <b>highest lakes in India</b>, and the pairing to remember is exact: Baralacha La, two lakes on its two sides, two rivers, one confluence at Tandi."],
  ["note","Exam hook","Lahaul · below Baralacha La · source of the Bhaga · among the highest lakes in India · pairs with Chandra Tal across the same pass."]],
 rel:["t-lakes","Bhaga","ps-baralacha","d-lahaul"]},

{id:"lk-bhrigu", k:"lake", pid:"bhrigu", name:"Bhrigu Lake",
 type:"Natural",
 sacred:"The sage Bhrigu",
 districts:["d-kullu"],
 blocks:[
  ["p","Bhrigu Lake, above <b>Gulaba</b> in Kullu, takes its name from the sage <b>Bhrigu</b>, said to have meditated on its bank."],
  ["p","It is one of three high-altitude Kullu lakes in this roster, alongside Dashair and Sareolsar, all reached on foot rather than by road."],
  ["note","Exam hook","Kullu, above Gulaba · sage Bhrigu's meditation lake."]],
 rel:["t-lakes","d-kullu"]},

{id:"lk-dashair", k:"lake", pid:"dashair", name:"Dashair Lake",
 type:"Natural",
 districts:["d-kullu"],
 blocks:[
  ["p","Dashair Lake lies in Kullu near <b>Rohtang</b>, in the same high cluster as Bhrigu Lake above Gulaba."],
  ["p","What this roster asks of it is mainly its location, so as not to confuse it with Bhrigu or Sareolsar, the district's other two named high lakes."],
  ["note","Exam hook","Kullu · near Rohtang · one of the district's three named high lakes, with Bhrigu and Sareolsar."]],
 rel:["t-lakes","d-kullu","ps-rohtang"]},

{id:"lk-manimahesh", k:"lake", pid:"manimahesh", name:"Manimahesh Lake",
 type:"Natural",
 sacred:"Shiva — the Manimahesh yatra",
 districts:["d-chamba"],
 blocks:[
  ["p","Manimahesh Lake, in Chamba, lies directly below <b>Manimahesh Kailash</b>, the peak held sacred as Shiva's abode and, unlike the state's other high peaks, never climbed."],
  ["p","The lake is the destination of the <b>Manimahesh yatra</b>, held in <b>August–September</b> — pilgrims bathe in the lake with the peak as backdrop, the mountain itself being the object of worship rather than an ascent."],
  ["note","Exam hook","Chamba · below Manimahesh Kailash (never climbed) · the Manimahesh yatra, August–September."]],
 rel:["t-lakes","t-shaktipeeth","pk-manimaheshkailash","d-chamba"]},

{id:"lk-lamadal", k:"lake", pid:"lamadal", name:"Lama Dal",
 type:"Natural",
 districts:["d-chamba"],
 blocks:[
  ["p","Lama Dal, in Chamba, is the <b>largest of the Dhauladhar's high lakes</b> named in this roster, ranking above the district's other named glacial lakes, Ghadasaru and Khajjiar among them."],
  ["p","Beyond its size, no separate legend is attached to it in the record — worth remembering precisely because it is easy to confuse with Manimahesh, the district's lake that does carry a yatra."],
  ["note","Exam hook","Chamba · the largest of the Dhauladhar's high lakes."]],
 rel:["t-lakes","d-chamba"]},

{id:"lk-ghadasaru", k:"lake", pid:"ghadasaru", name:"Ghadasaru Lake",
 type:"Natural",
 districts:["d-chamba"],
 blocks:[
  ["p","Ghadasaru is one of Chamba's small named lakes in this roster, grouped alongside Lama Dal and Khajjiar as lakes distinct from Manimahesh, the district's pilgrimage lake."],
  ["p","No separate legend attaches to it beyond its district and its kind — a natural lake of Chamba, to be told apart from the other three named here."],
  ["note","Exam hook","Chamba · one of the district's named natural lakes, alongside Lama Dal and Khajjiar."]],
 rel:["t-lakes","d-chamba"]},

{id:"lk-khajjiar", k:"lake", pid:"khajjiar", name:"Khajjiar Lake",
 type:"Natural",
 districts:["d-chamba"],
 blocks:[
  ["p","Khajjiar, in Chamba, sits at the centre of a saucer-shaped meadow popularly called the <b>'mini Switzerland'</b> of Himachal — the standard identifying hook for this lake."],
  ["p","It is grouped with Lama Dal and Ghadasaru as one of Chamba's named natural lakes, though its fame rests on the meadow around it rather than on any pilgrimage, unlike Manimahesh in the same district."],
  ["note","Exam hook","Chamba · the saucer meadow called the 'mini Switzerland' of Himachal."]],
 rel:["t-lakes","t-nationalparks","d-chamba"]},

{id:"lk-nako", k:"lake", pid:"nako", name:"Nako Lake",
 type:"Natural",
 sacred:"Beside Nako monastery, a Rinchen Zangpo foundation",
 districts:["d-kinnaur"],
 blocks:[
  ["p","Nako Lake lies in the <b>Hangrang valley</b> of Kinnaur, beside <b>Nako village and its monastery</b> — one of the Rinchen Zangpo foundations in the state's Buddhist heritage, alongside <b>Tabo</b>."],
  ["p","It is the one lake in this roster that sits in the cold-desert tract of upper Kinnaur, close to the Spiti border."],
  ["note","Exam hook","Kinnaur, Hangrang valley · beside Nako monastery, a Rinchen Zangpo foundation."]],
 rel:["t-lakes","t-monasteries","d-kinnaur"]},

{id:"lk-dallake", k:"lake", pid:"dallake", name:"Dal Lake, Dharamshala",
 type:"Natural",
 districts:["d-kangra"],
 blocks:[
  ["p","This Dal Lake, in Kangra above <b>McLeodganj</b>, takes its name from the far more famous one in Srinagar but is otherwise unrelated to it — the two are easy to confuse in an objective question and should not be."],
  ["p","It sits close to <b>Tsuglagkhang and Namgyal Monastery</b>, the residence of the 14th Dalai Lama and seat of the Central Tibetan Administration since 1960, the institutions that give McLeodganj its wider significance."],
  ["note","Exam hook","Kangra, above McLeodganj · not to be confused with the Dal Lake of Srinagar."]],
 rel:["t-lakes","t-monasteries","d-kangra"]},

{id:"lk-gobindsagar", k:"lake", pid:"gobindsagar", name:"Gobind Sagar",
 type:"Reservoir",
 river:"Sutlej",
 districts:["d-bilaspur"],
 blocks:[
  ["p","Gobind Sagar, formed by the <b>Bhakra dam</b> on the <b>Sutlej</b> at Bilaspur, is the <b>largest man-made lake in Himachal Pradesh</b>. The dam is a straight gravity structure about <b>226 m high</b>, its foundation stone laid in 1948 and the project completed and dedicated in 1963."],
  ["p","The old town of <b>Bilaspur was submerged</b> by the rising reservoir and rebuilt on higher ground — the standard case cited whenever a question asks about development-induced displacement in the state. <b>Naina Devi temple</b> overlooks the lake from above."],
  ["note","Exam hook","Sutlej · Bhakra, Bilaspur · <b>largest man-made lake in HP</b> · old Bilaspur town submerged and rebuilt · overlooked by Naina Devi temple."]],
 rel:["t-lakes","t-bhakra","t-hydel","Sutlej","d-bilaspur"]},

{id:"lk-pong", k:"lake", pid:"pong", name:"Pong / Maharana Pratap Sagar",
 type:"Reservoir",
 river:"Beas",
 ramsar:"Ramsar site, 2002",
 districts:["d-kangra"],
 blocks:[
  ["p","Pong, formally <b>Maharana Pratap Sagar</b>, is the reservoir behind the dam on the <b>Beas</b> in Kangra, completed in <b>1974</b> and generating <b>396 MW</b>. It was designated a <b>Ramsar site in 2002</b> and is a major <b>bird sanctuary</b>."],
  ["p","Its construction displaced a very large number of families from the Beas valley, many resettled in Rajasthan's command area — a rehabilitation grievance that, together with Gobind Sagar, is the state's standard case study in development-induced displacement."],
  ["note","Exam hook","Beas · Kangra · completed 1974 · 396 MW · <b>Ramsar 2002</b> · major bird sanctuary · Beas-valley oustees resettled largely in Rajasthan."]],
 rel:["t-lakes","t-bhakra","t-nationalparks","t-hydel","Beas","d-kangra"]},

{id:"lk-chamera", k:"lake", pid:"chamera", name:"Chamera Lake",
 type:"Reservoir",
 river:"Ravi",
 districts:["d-chamba"],
 blocks:[
  ["p","Chamera Lake is the reservoir of the Chamera hydel projects on the <b>Ravi</b> in Chamba — the district's own river, and the one on which NHPC commissioned its very first project anywhere in India, <b>Baira Siul</b>."],
  ["p","Among the five named reservoirs of this roster — Gobind Sagar, Pong, Chamera, Pandoh and Kol Dam — it is the only one built on the Ravi rather than the Sutlej or the Beas."],
  ["note","Exam hook","Ravi · Chamba · the only named HP reservoir in this roster on the Ravi."]],
 rel:["t-lakes","t-hydel","Ravi","d-chamba"]},

{id:"lk-pandoh", k:"lake", pid:"pandoh", name:"Pandoh Dam",
 type:"Reservoir",
 river:"Beas",
 districts:["d-mandi"],
 blocks:[
  ["p","Pandoh, on the <b>Beas</b> in Mandi, is the diversion dam that feeds the <b>Beas–Sutlej Link</b> — Beas water is carried through the <b>Pandoh–Baggi tunnel</b> to the Sutlej side, generating power at <b>Dehar</b> along the way."],
  ["p","It exists to move water between basins rather than to hold a lake in its own right, which sets it apart from the other reservoirs named in this roster."],
  ["note","Exam hook","Beas · Mandi · feeds the Beas–Sutlej Link, through the Pandoh–Baggi tunnel to Dehar."]],
 rel:["t-lakes","t-hydel","Beas","d-mandi"]},

{id:"lk-koldam", k:"lake", pid:"koldam", name:"Kol Dam",
 type:"Reservoir",
 river:"Sutlej",
 districts:["d-bilaspur","d-mandi"],
 blocks:[
  ["p","Kol Dam, on the <b>Sutlej</b> across the Bilaspur–Mandi border, is an <b>800 MW</b> project operated by <b>NTPC</b>, one of the four major Sutlej hydel projects named together in this roster — Bhakra, Nathpa Jhakri, Karcham Wangtoo and Kol Dam."],
  ["p","With Gobind Sagar, it is one of only two named lakes on the Sutlej within Himachal Pradesh in this roster."],
  ["note","Exam hook","Sutlej · Bilaspur/Mandi · 800 MW · NTPC."]],
 rel:["t-lakes","t-hydel","Sutlej","d-bilaspur","d-mandi"]},

/* ---------- GLACIERS ---------- */
{id:"gl-barashigri", k:"glacier", pid:"barashigri", name:"Bara Shigri",
 size:"About 28 km long", valley:"Chandra valley, Lahaul",
 feeds:"Chandra, which becomes the Chenab at Tandi",
 retreat:"In the Chandra basin, the belt this roster's standard retreat question is built around",
 districts:["d-lahaul"],
 blocks:[
  ["p","Bara Shigri, in the <b>Chandra valley</b> of Lahaul, is <b>the largest glacier in Himachal Pradesh</b> — about 28 km long, feeding the <b>Chandra</b> for much of its run down the valley. <b>Shigri Parbat</b> rises directly above it, the peak this roster already names for standing over it."],
  ["p","Its scale makes it the reference glacier for the whole Chandra–Spiti system: whenever a question asks which basin's retreat matters most for Himachal's hydel planning and for glacial-lake outburst flood risk, Bara Shigri and its Lahaul neighbours are the standard answer."],
  ["note","Exam hook","Chandra valley, Lahaul · about 28 km · <b>largest glacier in Himachal Pradesh</b> · feeds the Chandra → Chenab · below Shigri Parbat · the reference glacier for Chandra–Spiti retreat."]],
 rel:["t-peaks","d-lahaul","Chandra","pk-shigriparbat","t-disaster"]},

{id:"gl-chandranahan", k:"glacier", pid:"chandranahan", name:"Chandra Nahan",
 valley:"Above Rohru, Shimla district", feeds:"Pabbar",
 districts:["d-shimla"],
 blocks:[
  ["p","Chandra Nahan, above <b>Rohru</b> in Shimla district, is the <b>source of the Pabbar</b> — the river of the Rohru–Pabbar valley that runs through the upper-Shimla apple belt. The glacial <b>Chandra Nahan lake</b> sits at its foot."],
  ["p","It lies outside the Chandra–Spiti belt that usually anchors questions on glacier retreat, but its recession matters just as much: the Pabbar's flow, and the apple-belt life that depends on it, trace back to this one glacier the way the bigger Lahaul rivers trace back to theirs."],
  ["note","Exam hook","Above Rohru, Shimla · source of the <b>Pabbar</b> · Chandra Nahan lake below it."]],
 rel:["t-peaks","d-shimla","Pabbar","t-disaster"]},

{id:"gl-beaskund", k:"glacier", pid:"beaskund", name:"Beas Kund",
 valley:"Solang, Kullu, below Rohtang La", feeds:"Beas",
 districts:["d-kullu"],
 blocks:[
  ["p","Beas Kund, in the Solang side valley of Kullu just below <b>Rohtang La</b>, is the <b>source of the Beas</b> — the one of Himachal's five major rivers that both rises and runs almost entirely inside the state."],
  ["p","Every account of the Beas begins here, the way the Chandra and the Bhaga both begin at Baralacha La — the pass above it is remembered for the road into Lahaul, but for the river system what starts at this glacier is the more important fact."],
  ["note","Exam hook","Solang, Kullu, below Rohtang La · <b>source of the Beas</b>."]],
 rel:["t-peaks","d-kullu","Beas","ps-rohtang","t-disaster"]},

{id:"gl-parvatigl", k:"glacier", pid:"parvatigl", name:"Parvati Glacier",
 valley:"Parvati valley, Kullu", feeds:"Parvati, which joins the Beas at Bhuntar",
 districts:["d-kullu"],
 blocks:[
  ["p","Parvati Glacier lies at the head of the <b>Parvati valley</b> in Kullu, one of the glaciers whose melt feeds the <b>Parvati</b> on its way down to join the <b>Beas at Bhuntar</b>."],
  ["p","It sits in the same upper basin as the <b>Mantalai glacier</b>, from which the Pin Parvati Pass record already traces the river's rise — together they are the ice at the head of the valley that keeps the Parvati flowing."],
  ["note","Exam hook","Parvati valley, Kullu · feeds the <b>Parvati</b>, which joins the Beas at Bhuntar."]],
 rel:["t-peaks","d-kullu","Parvati","Beas","ps-pinparvati","t-disaster"]},

{id:"gl-sonapani", k:"glacier", pid:"sonapani", name:"Sonapani",
 valley:"Chandra basin, Lahaul", feeds:"Chandra, which becomes the Chenab at Tandi",
 retreat:"One of the more closely studied glaciers of the Chandra basin for retreat",
 districts:["d-lahaul"],
 blocks:[
  ["p","Sonapani, in the <b>Chandra basin</b> of Lahaul, is one of the glaciers that feed the <b>Chandra</b> on its run down to Tandi, where it becomes the <b>Chenab</b>."],
  ["p","It is among the more closely studied glaciers of the basin for its retreat — the Chandra–Spiti belt is the state's standard case for glacier recession, tied both to the region's hydel potential and to the risk of glacial-lake outburst floods further downstream."],
  ["note","Exam hook","Chandra basin, Lahaul · feeds the Chandra → Chenab · closely studied for retreat."]],
 rel:["t-peaks","d-lahaul","Chandra","t-disaster"]},

{id:"gl-gangstang", k:"glacier", pid:"gangstang", name:"Gangstang",
 valley:"Bhaga basin, Lahaul", feeds:"Bhaga, which becomes the Chenab at Tandi",
 districts:["d-lahaul"],
 blocks:[
  ["p","Gangstang, in the <b>Bhaga basin</b> of Lahaul, lies below <b>Gangstang peak</b> and feeds the <b>Bhaga</b> on its way to Tandi, where the river becomes the <b>Chenab</b>."],
  ["p","It is the Bhaga-side counterpart to the Chandra basin's glaciers further south — the same retreat concerns that apply to Bara Shigri and Sonapani apply here too, since both headwaters feed the state's largest untapped hydel basin."],
  ["note","Exam hook","Bhaga basin, Lahaul · below Gangstang peak · feeds the Bhaga → Chenab."]],
 rel:["t-peaks","d-lahaul","Bhaga","t-disaster"]},

{id:"gl-perad", k:"glacier", pid:"perad", name:"Perad",
 valley:"Lahaul–Chamba divide", feeds:"Chenab",
 districts:["d-lahaul","d-chamba"],
 blocks:[
  ["p","Perad sits on the <b>Lahaul–Chamba divide</b>, one of the less-documented glaciers in this roster, its meltwater draining eventually into the <b>Chenab</b> system that the Chandra and Bhaga both feed."],
  ["p","Its position on the district boundary places it among the glaciers of upper Chamba and Lahaul whose retreat is watched for the same reasons as the better-studied ice of the Chandra valley — the bearing on downstream hydel generation and on glacial-lake outburst flood risk."],
  ["note","Exam hook","Lahaul–Chamba divide · feeds the Chenab system."]],
 rel:["t-peaks","d-lahaul","d-chamba","Chenab","t-disaster"]},

{id:"gl-dudhon", k:"glacier", pid:"dudhon", name:"Dudhon",
 valley:"Parvati basin, Kullu", feeds:"Parvati, which joins the Beas at Bhuntar",
 districts:["d-kullu"],
 blocks:[
  ["p","Dudhon, in the <b>Parvati basin</b> of Kullu, is counted among the <b>largest glaciers of the Beas basin</b>, feeding the <b>Parvati</b> on its way to join the <b>Beas at Bhuntar</b>."],
  ["p","It sits alongside Parvati Glacier at the head of the same valley, part of the glacier field that keeps the Parvati flowing through the dry months — and, like the rest of Kullu and Lahaul's glaciers, one whose retreat is tracked for what it means downstream."],
  ["note","Exam hook","Parvati basin, Kullu · among the largest glaciers of the Beas basin · feeds the Parvati → Beas."]],
 rel:["t-peaks","d-kullu","Parvati","Beas","t-disaster"]},

{id:"gl-bhadal", k:"glacier", pid:"bhadal", name:"Bhadal",
 valley:"Bara Bangahal, Kangra", feeds:"Ravi",
 districts:["d-kangra"],
 blocks:[
  ["p","Bhadal, above <b>Bara Bangahal</b> in Kangra, feeds the stream that is one of the <b>Ravi's two parent streams</b> — the <b>Bhadal</b> and the <b>Tantgari</b> — which meet at Bara Bangahal to form the Ravi itself."],
  ["p","It is reached the same way the Ravi's headwaters are, over the <b>Thamsar Pass</b> from Bara Bhangal, and is worth pairing with that pass and with the Tantgari in any question on where the Ravi begins."],
  ["note","Exam hook","Bara Bangahal, Kangra · feeds the <b>Ravi</b> — one of its two parent streams, with the Tantgari, at Bara Bangahal."]],
 rel:["t-peaks","d-kangra","Ravi","ps-thamsar","t-disaster"]},

{id:"gl-ladyofkeylong", k:"glacier", pid:"ladyofkeylong", name:"Lady of Keylong",
 valley:"Above Keylong, Lahaul", feeds:"Bhaga, which becomes the Chenab at Tandi",
 districts:["d-lahaul"],
 blocks:[
  ["p","Lady of Keylong takes its name from the figure its <b>snow shape is said to trace</b> on the mountainside above <b>Keylong</b>, the headquarters of Lahaul & Spiti — a local landmark rather than a peak or a pass."],
  ["p","It feeds the <b>Bhaga</b>, which flows past Keylong on its way to Tandi and the Chenab, so the glacier that gives the town its skyline sits above the same river that gives the district its headwaters."],
  ["note","Exam hook","Above Keylong, Lahaul · named for the figure its snow shape traces · feeds the Bhaga → Chenab."]],
 rel:["t-peaks","d-lahaul","Bhaga","t-disaster"]},

{id:"gl-miyar", k:"glacier", pid:"miyar", name:"Miyar",
 valley:"Miyar valley, Lahaul", feeds:"Miyar Nala, which joins the Chenab",
 districts:["d-lahaul"],
 blocks:[
  ["p","Miyar Glacier sits at the head of the long <b>Miyar valley</b> in Lahaul — the long valley approach that gives this glacier its character in the roster, distinct from the shorter, road-served approaches to the Chandra basin's glaciers."],
  ["p","Its meltwater drains through the <b>Miyar Nala</b> to the <b>Chenab</b>, named among the Chenab's own tributaries below the Chandra–Bhaga confluence at Tandi; <b>Mulkila</b>, on the Miyar–Chandra divide, stands above the same valley."],
  ["note","Exam hook","Miyar valley, Lahaul · the long Miyar valley approach · feeds the Miyar Nala → Chenab."]],
 rel:["t-peaks","d-lahaul","Chenab","pk-mulkila","t-disaster"]},

{id:"gl-pingl", k:"glacier", pid:"pingl", name:"Pin Glacier",
 valley:"Pin valley, Spiti", feeds:"Pin, which joins the Spiti, which joins the Sutlej at Khab",
 retreat:"In the Chandra–Spiti belt, the standard retreat question, tied to hydel and GLOF risk",
 districts:["d-lahaul"],
 blocks:[
  ["p","Pin Glacier lies in the <b>Pin valley</b> of Spiti, inside the <b>Pin Valley National Park</b>, and feeds the <b>Pin</b> river — which joins the <b>Spiti</b>, and the Spiti in turn joins the <b>Sutlej at Khab</b>."],
  ["p","The Pin valley is cold-desert country, one of the driest tracts in the state, and its glacier sits squarely in the <b>Chandra and Spiti belt</b> that this roster's standard retreat question is built around — recession here is watched for its bearing on the Sutlej's hydel schemes downstream and on glacial-lake outburst flood risk."],
  ["note","Exam hook","Pin valley, Spiti · in the Pin Valley National Park · feeds Pin → Spiti → Sutlej, at Khab · in the Chandra–Spiti retreat belt."]],
 rel:["t-peaks","d-lahaul","Spiti","Sutlej","t-nationalparks","t-disaster"]}

];

