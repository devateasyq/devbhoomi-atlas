/* Brand mark — a single contour line spiralling inward and up to a brass trig point:
   a topographic sheet and a revision loop drawn as the same shape. Themed from CSS tokens.

   logoMark()      three-turn spiral. Legible from about 24px up.
   logoMarkSmall() two closed contours + the trig point. Holds down to 16px, where the
                   spiral's inner turns close up and mush. Use it for favicons and chips. */
const LOGO_SPIRAL =
  "M7 30 C5 16 15 6 25 7 C36 8 43 16 41 25 C39 35 30 41 22 39 C13 37 10 30 12 24 " +
  "C14 18 21 14 27 16 C33 18 35 24 32 28 C29.5 31.5 23 32.5 20.5 29 C19 26.8 19.4 25 20.8 24.4";

function logoMark(size){
  size = size || 30;
  return '<svg class="logo" viewBox="0 0 48 48" width="'+size+'" height="'+size+'" '+
    'role="img" aria-label="Parikrama Path">'+
    '<path d="'+LOGO_SPIRAL+'" fill="none" stroke="var(--accent)" '+
      'stroke-width="2.6" stroke-linecap="round"/>'+
    '<circle cx="25.6" cy="23" r="2.6" fill="var(--gold)"/>'+
    '</svg>';
}

function logoMarkSmall(size){
  size = size || 16;
  return '<svg class="logo" viewBox="0 0 48 48" width="'+size+'" height="'+size+'" '+
    'role="img" aria-label="Parikrama Path">'+
    '<path d="M24 41 C13.5 41 5.5 34 5.5 25.5 C5.5 16 14 8.5 24.5 8.5 '+
      'C35 8.5 42.5 16.5 42.5 25.5 C42.5 34.5 34.5 41 24 41 Z" '+
      'fill="none" stroke="var(--accent)" stroke-width="3.4"/>'+
    '<path d="M24 31.5 C18.5 31.5 15 28 15 24.5 C15 20.5 19 17.5 24.3 17.5 '+
      'C29.5 17.5 33 20.8 33 24.7 C33 28.4 29.5 31.5 24 31.5 Z" '+
      'fill="none" stroke="var(--accent)" stroke-width="3.4"/>'+
    '<circle cx="24" cy="24.5" r="3" fill="var(--gold)"/>'+
    '</svg>';
}
