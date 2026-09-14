/* ============================================================
   auth — a thin wrapper over Firebase Auth.
   Every function is safe to call when Firebase is not configured;
   they resolve to null or reject cleanly, so the signed-out app
   never depends on any of this working.
   ============================================================ */
"use strict";

var _user = null, _watchers = [], _wired = false;

function authAvailable(){ return typeof FB_READY !== "undefined" && FB_READY; }
function authUser(){ return _user; }

/* The SDK is half a megabyte. Most people who open this page have never
   signed in and never will — they arrived from a search for a district or a
   pass — so boot must not fetch it on their behalf. These three predicates
   answer "is there anything here that only the SDK can resolve?" without
   loading it.

   Firebase compat keys its stored state `firebase:<name>:<apiKey>:<appName>`
   (see Ce() in vendor/firebase-auth-compat.js), so a prefix scan finds it
   without knowing the project's apiKey. */
function _hasPrefix(store, prefix){
  try{
    for(var i = 0; i < store.length; i++){
      var k = store.key(i);
      if(k && k.indexOf(prefix) === 0) return true;
    }
  }catch(e){ /* storage blocked: nothing could have been persisted either */ }
  return false;
}
function storedSession(){
  return _hasPrefix(localStorage, "firebase:authUser:") ||
         _hasPrefix(localStorage, "firebase:redirectUser:");
}
function redirectPending(){
  return _hasPrefix(sessionStorage, "firebase:pendingRedirect:") ||
         _hasPrefix(sessionStorage, "firebase:redirectUser:") ||
         _hasPrefix(localStorage,   "firebase:redirectUser:");
}
/* A returning email link carries Firebase's own one-time parameters. Being
   slightly generous costs nothing: isSignInWithEmailLink() is still the
   authority once the SDK is up. */
function emailLinkInUrl(){
  return /[?&]oobCode=/.test(location.search) && /[?&]mode=signIn/.test(location.search);
}

/* The single door to the SDK. Whatever reason it is being loaded for, the
   auth-state listener is attached the first time through — otherwise a
   sign-in that happens after a lazy boot would never reach the watchers,
   and the app would sit there signed out with a signed-in Firebase. */
function withFirebase(){
  return loadFirebase().then(function(fb){
    if(!_wired){
      _wired = true;
      fb.auth().onAuthStateChanged(function(u){
        _user = u || null;
        for(var i = 0; i < _watchers.length; i++) _watchers[i](_user);
      });
    }
    return fb;
  });
}

function onAuthChange(fn){
  _watchers.push(fn);
  fn(_user);
  if(!authAvailable()) return;
  /* Nothing stored means nobody to restore. A later sign-in goes through
     withFirebase(), which wires the listener then. */
  if(!storedSession() && !redirectPending()) return;
  withFirebase().catch(function(){ /* stays signed out, which is a working state */ });
}

/* A popup is the nicer desktop experience, but iOS Safari blocks it routinely
   and an installed PWA has no popup context at all. Fall back to a redirect,
   which navigates to Google and returns — nothing for a browser to block. */
var REDIRECT_CODES = {
  "auth/popup-blocked": 1,
  "auth/popup-closed-by-user": 1,
  "auth/cancelled-popup-request": 1,
  "auth/operation-not-supported-in-this-environment": 1,
  "auth/web-storage-unsupported": 1
};
function signInGoogle(){
  return withFirebase().then(function(fb){
    var p = new fb.auth.GoogleAuthProvider();
    return fb.auth().signInWithPopup(p).catch(function(err){
      if(!err || !REDIRECT_CODES[err.code]) throw err;
      /* the redirect never resolves here: the page navigates away and
         completeRedirect() picks the result up on the way back */
      return fb.auth().signInWithRedirect(p);
    });
  });
}

/* Runs on load, like completeEmailLink. Resolves to a user when we have just
   come back from Google, and to null otherwise. */
function completeRedirect(){
  if(!authAvailable() || !redirectPending()) return Promise.resolve(null);
  return withFirebase().then(function(fb){
    return fb.auth().getRedirectResult().then(function(res){
      return (res && res.user) ? res.user : null;
    });
  });
}

/* Passwordless email link. The address is kept so the returning link can
   finish without asking for it a second time on the same device. */
function sendSignInLink(email){
  return withFirebase().then(function(fb){
    return fb.auth().sendSignInLinkToEmail(email, {
      url: location.origin + location.pathname,
      handleCodeInApp: true
    }).then(function(){
      try{ localStorage.setItem("hpatlas:emailForSignIn", email); }catch(e){}
    });
  });
}

function completeEmailLink(){
  if(!authAvailable() || !emailLinkInUrl()) return Promise.resolve(null);
  return withFirebase().then(function(fb){
    if(!fb.auth().isSignInWithEmailLink(location.href)) return null;
    var email = "";
    try{ email = localStorage.getItem("hpatlas:emailForSignIn") || ""; }catch(e){}
    if(!email) email = window.prompt("Confirm the email address you asked the link for") || "";
    if(!email) return null;
    return fb.auth().signInWithEmailLink(email, location.href).then(function(res){
      try{ localStorage.removeItem("hpatlas:emailForSignIn"); }catch(e){}
      /* strip the one-time credentials out of the address bar */
      history.replaceState(null, "", location.origin + location.pathname + location.hash);
      return res.user;
    });
  });
}

function signOutUser(){
  if(!authAvailable()) return Promise.resolve();
  return withFirebase().then(function(fb){ return fb.auth().signOut(); });
}
