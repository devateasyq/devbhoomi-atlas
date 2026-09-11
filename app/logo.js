/* Brand mark — Dhauladhar peaks with a river running out of them, which is
   the same pair of ideas the atlas is built on. Themed from CSS tokens. */
function logoMark(size){
  size = size || 30;
  return '<svg class="logo" viewBox="0 0 48 48" width="'+size+'" height="'+size+'" '+
    'role="img" aria-label="Devbhoomi Atlas">'+
    '<circle cx="34.5" cy="12" r="5.5" fill="var(--gold)"/>'+
    '<path d="M2 34 L14 14 L22 26 L28.5 16 L46 34 Z" fill="var(--accent)"/>'+
    '<path d="M14 14 L9.4 21.6 L18.6 21.6 Z" fill="var(--surface)" opacity=".92"/>'+
    '<path d="M28.5 16 L24.6 22 L32.4 22 Z" fill="var(--surface)" opacity=".92"/>'+
    '<path d="M2 38.5 C11 34.5, 15 42.5, 24 38.5 S37 34.5, 46 38.5" fill="none" '+
      'stroke="var(--water)" stroke-width="3.4" stroke-linecap="round"/>'+
    '</svg>';
}
