/* ============================================================
   auth — a thin wrapper over Firebase Auth.
   Every function is safe to call when Firebase is not configured;
   they resolve to null or reject cleanly, so the signed-out app
   never depends on any of this working.
   ============================================================ */
"use strict";

var _user = null, _watchers = [];

function authAvailable(){ return typeof FB_READY !== "undefined" && FB_READY; }
function authUser(){ return _user; }

function onAuthChange(fn){
  _watchers.push(fn);
  fn(_user);
  if(!authAvailable()) return;
  loadFirebase().then(function(fb){
    fb.auth().onAuthStateChanged(function(u){
      _user = u || null;
      for(var i = 0; i < _watchers.length; i++) _watchers[i](_user);
    });
  }).catch(function(){ /* stays signed out, which is a working state */ });
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
  return loadFirebase().then(function(fb){
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
  if(!authAvailable()) return Promise.resolve(null);
  return loadFirebase().then(function(fb){
    return fb.auth().getRedirectResult().then(function(res){
      return (res && res.user) ? res.user : null;
    });
  });
}

/* Passwordless email link. The address is kept so the returning link can
   finish without asking for it a second time on the same device. */
function sendSignInLink(email){
  return loadFirebase().then(function(fb){
    return fb.auth().sendSignInLinkToEmail(email, {
      url: location.origin + location.pathname,
      handleCodeInApp: true
    }).then(function(){
      try{ localStorage.setItem("hpatlas:emailForSignIn", email); }catch(e){}
    });
  });
}

function completeEmailLink(){
  if(!authAvailable()) return Promise.resolve(null);
  return loadFirebase().then(function(fb){
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
  return loadFirebase().then(function(fb){ return fb.auth().signOut(); });
}
