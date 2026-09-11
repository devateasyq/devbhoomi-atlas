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
 rel:["t-passes","d-mandi","d-kullu","d-shimla"]}

];
