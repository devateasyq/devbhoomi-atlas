/* Photographs behind the Rounds cards. Every one is freely licensed;
   CC BY and CC BY-SA both require attribution, so each card carries its
   photographer and licence, and README lists them with source links.
   Keyed by fact kind. Battles and people fall back, since those records
   carry no exam hooks yet and so produce no facts. */
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
