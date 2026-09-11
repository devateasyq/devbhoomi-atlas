/* Photographs behind the Rounds cards, all freely licensed. CC BY and
   CC BY-SA both require attribution, so every card carries its
   photographer and licence, and the README lists sources.

   PIC_REC is keyed by record id and wins where it has an entry;
   PICS is the per-kind fallback, so every card has an image even
   where no photograph of that exact subject exists on Commons. */
const PICS = {
  pass:{s:"img/pass.webp", t:"Kunzum La", a:"Gerd Eichmann", l:"CC BY 4.0", u:"https://commons.wikimedia.org/wiki/File:Kunzum_La-19a-pass_height-Berge-2016-gje.jpg"},
  lake:{s:"img/lake.webp", t:"Chandra Taal", a:"Adarsh Patel", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Chandra_Taal_(Lake),_HP,_India,_D35_7333_nx01.jpg"},
  glacier:{s:"img/glacier.webp", t:"Bara Shigri, 1863", a:"Philip Henry Egerton", l:"CC0", u:"https://commons.wikimedia.org/wiki/File:Ice_Cave_at_the_Bara_Shigri_Terminus,_1863.jpg"},
  peak:{s:"img/peak.webp", t:"Kinner Kailash", a:"Anubhav Agarwal", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Kinner_Kailash_Mountain_Range_(edited).jpg"},
  river:{s:"img/river.webp", t:"The Beas at Kullu", a:"Vyacheslav Argenberg", l:"CC BY 4.0", u:"https://commons.wikimedia.org/wiki/File:Kullu_Valley,_Beas_River_near_Manali,_India.jpg"},
  state:{s:"img/state.webp", t:"Kangra Fort", a:"Monika rana", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Ruined_fort_of_kangra,_kangra,_H.P.jpg"},
  district:{s:"img/district.webp", t:"The Dhauladhar", a:"Metanish", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Dhauladhar_layers.JPG"},
  topic:{s:"img/topic.webp", t:"Bhimakali, Sarahan", a:"Gerd Eichmann", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Sarahan-Bhimakali-06-gje.jpg"},
  event:{s:"img/event.webp", t:"Viceregal Lodge, Shimla", a:"Aloofmanish", l:"CC0", u:"https://commons.wikimedia.org/wiki/File:Viceregal_Lodge_Shimla.jpg"}
};
PICS.battle = PICS.state;
PICS.person = PICS.event;

const PIC_REC = {
  "ps-rohtang":{s:"img/ps-rohtang.webp", t:"Rohtang La", a:"Timothy A. Gonsa", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Snow_Rohtang_Range_Manali_May24_A7CR_00128.jpg"},
  "ps-baralacha":{s:"img/ps-baralacha.webp", t:"Baralacha La", a:"Tagooty", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Baralacha_La_Lahaul_D32_13255.jpg"},
  "ps-jalori":{s:"img/ps-jalori.webp", t:"Jalori Pass", a:"Manish57335", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Camping_at_Jalori_pass.jpg"},
  "ps-sach":{s:"img/ps-sach.webp", t:"Sach Pass", a:"Sunilbanger", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Close_view_of_pir_panjal_from_sach_pass_chamba.jpg"},
  "ps-hamta":{s:"img/ps-hamta.webp", t:"Hamta Pass", a:"Dakshchadha1", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Hamta_pass,_Himalayas.jpg"},
  "ps-shipkila":{s:"img/ps-shipkila.webp", t:"Shipki La", a:"Rakeshk9548", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Shipki_la.jpg"},
  "lk-renuka":{s:"img/lk-renuka.webp", t:"Renuka Lake", a:"Pushkar Prashar", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Renuka_Lake_Sirmaur.jpg"},
  "lk-rewalsar":{s:"img/lk-rewalsar.webp", t:"Rewalsar (Tso Pema)", a:"Gannu03", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Rewalsar_lake_01.jpg"},
  "lk-prashar":{s:"img/lk-prashar.webp", t:"Prashar Lake", a:"Navneet Sharma", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Parashar_Lake_September_2020.jpg"},
  "lk-khajjiar":{s:"img/lk-khajjiar.webp", t:"Khajjiar Lake", a:"Wittystef", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Khajjiar_lake.jpg"},
  "lk-gobindsagar":{s:"img/lk-gobindsagar.webp", t:"Gobind Sagar", a:"Gurlal Maan", l:"CC BY-SA 3.0", u:"https://commons.wikimedia.org/wiki/File:Boats_in_Gobind_Sagar,_Himachal_Pardesh.jpg"},
  "lk-surajtal":{s:"img/lk-surajtal.webp", t:"Suraj Tal", a:"Timothy Gonsalves", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Suraj_Tal_Lahaul_Himachal_Jul16_D32_13220.jpg"},
  "lk-nako":{s:"img/lk-nako.webp", t:"Nako Lake", a:"Timothy A. Gonsa", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Nako_Lake_Kinnaur_Himachal_Jun18_D72_6798.jpg"},
  "lk-manimahesh":{s:"img/lk-manimahesh.webp", t:"Manimahesh Lake", a:"NaturenHuman", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Mt._Kailash_Manimahesh_Lake.jpg"},
  "pk-reopurgyil":{s:"img/pk-reopurgyil.webp", t:"Reo Purgyil", a:"Arashdeep", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Peaks_of_Mt_Leo_Purgyil_and_Reo_Purgyil.jpg"},
  "pk-hanumantibba":{s:"img/pk-hanumantibba.webp", t:"Hanuman Tibba", a:"Biswarup Ganguly", l:"CC BY 3.0", u:"https://commons.wikimedia.org/wiki/File:Mount_Hanuman_Tibba_-_Solang_Valley_-_Kullu_2014-05-10_2594.JPG"},
  "pk-chaudhar":{s:"img/pk-chaudhar.webp", t:"Churdhar", a:"UnpetitproleX", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Churdhar_WS,_view_towards_Tons_valley,_Himachal_Pradesh,_India.jpg"},
  "pk-manimaheshkailash":{s:"img/pk-manimaheshkailash.webp", t:"Manimahesh Kailash", a:"Ramkrish1in31", l:"CC BY-SA 3.0", u:"https://commons.wikimedia.org/wiki/File:ManiMahesh_Kailash.JPG"},
  "Sutlej":{s:"img/sutlej.webp", t:"Sutlej", a:"Darshan Simha", l:"CC BY 2.0", u:"https://commons.wikimedia.org/wiki/File:A_view_of_Sutlej_river_Himachal_Pradesh_India_2014.jpg"},
  "Ravi":{s:"img/ravi.webp", t:"Ravi", a:"Ms Sarah Welch", l:"CC0", u:"https://commons.wikimedia.org/wiki/File:Chamba_city_and_river_Ravi,_Himachal_Pradesh_India.jpg"},
  "Chenab":{s:"img/chenab.webp", t:"Chenab", a:"Timothy A. Gonsa", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Villages_Chenab_Udaipur_Lahaul_Himachal_Jul19_D72_10963.jpg"},
  "Yamuna":{s:"img/yamuna.webp", t:"Yamuna", a:"Abhi713", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Yamuna_river_beside_paonta_sahib_gurudwara_in_himachal_pradesh.jpg"},
  "d-lahaul":{s:"img/d-lahaul.webp", t:"Lahaul and Spiti", a:"Adarsh Patel", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Lord_Vishnu_Taal_(Lake),_Lahaul_and_Spiti_Dist.,_HP,_India,_D35_7480nx-01_01.jpg"},
  "t-monasteries":{s:"img/t-monasteries.webp", t:"Buddhist Monasteries", a:"Timothy A. Gonsalves", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:TaboMonastery-Tabo-Spiti-Himachal-D72_6827.jpg"},
  "s-sirmaur":{s:"img/s-sirmaur.webp", t:"Sirmaur", a:"Ramantharki", l:"CC BY-SA 4.0", u:"https://commons.wikimedia.org/wiki/File:Village_Dada_khelu,Mahipur,Nahan,district_Sirmour,_himachal_pradesh.jpg"}
};
