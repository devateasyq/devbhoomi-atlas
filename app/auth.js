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

function signInGoogle(){
  return loadFirebase().then(function(fb){
    var p = new fb.auth.GoogleAuthProvider();
    return fb.auth().signInWithPopup(p);
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
