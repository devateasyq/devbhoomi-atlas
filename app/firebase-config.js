/* Firebase project keys. These are not secrets — they identify the project
   and are visible in any client — but the project is only safe because of
   the Firestore rules in firestore.rules. Fill these in from the Firebase
   console: Project settings > Your apps > Web app.
   Left empty, the app runs exactly as it always has, with no accounts.
   Vendored SDK version: 10.12.2 (see vendor/firebase-*-compat.js). */
var FB_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};
var FB_READY = !!(FB_CONFIG.apiKey && FB_CONFIG.authDomain && FB_CONFIG.projectId && FB_CONFIG.appId);

/* The SDK is ~300 KB. Most visitors never sign in, so it is not put in front
   of first paint — it is fetched the first time it is actually needed, and
   the result is cached so a second call does not refetch. */
var _fbPromise = null;
function loadFirebase(){
  if(_fbPromise) return _fbPromise;
  if(!FB_READY) return Promise.reject(new Error("Firebase is not configured"));
  _fbPromise = new Promise(function(resolve, reject){
    var srcs = ["vendor/firebase-app-compat.js",
                "vendor/firebase-auth-compat.js",
                "vendor/firebase-firestore-compat.js"];
    var i = 0;
    (function next(){
      if(i >= srcs.length){
        try{
          if(!window.firebase.apps.length) window.firebase.initializeApp(FB_CONFIG);
          resolve(window.firebase);
        }catch(err){ reject(err); }
        return;
      }
      var s = document.createElement("script");
      s.src = srcs[i++];
      s.onload = next;
      s.onerror = function(){ reject(new Error("could not load " + s.src)); };
      document.head.appendChild(s);
    })();
  });
  return _fbPromise;
}
