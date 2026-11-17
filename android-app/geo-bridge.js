/* Android app: answer the page's location requests with Capacitor's native Geolocation plugin,
   which is far more reliable than the WebView's built-in geolocation. */
(function () {
  if (!navigator.geolocation) return;
  var web = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = function (ok, fail, opts) {
    var C = window.Capacitor, G = C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Geolocation;
    if (!G) return web(ok, fail, opts);
    opts = opts || {};
    (async function () {
      try {
        var perm = await G.checkPermissions();
        if (perm.location !== "granted" && perm.coarseLocation !== "granted") perm = await G.requestPermissions();
        if (perm.location !== "granted" && perm.coarseLocation !== "granted") throw { code: 1, message: "Location permission denied" };
        var pos;
        try { pos = await G.getCurrentPosition({ enableHighAccuracy: !!opts.enableHighAccuracy, timeout: 10000, maximumAge: opts.maximumAge || 0 }); }
        catch (first) { pos = await G.getCurrentPosition({ enableHighAccuracy: true, timeout: 25000, maximumAge: opts.maximumAge || 0 }); } // GPS fallback
        ok({ coords: pos.coords, timestamp: pos.timestamp });
      } catch (e) { if (fail) fail({ code: e && e.code === 1 ? 1 : 2, message: String((e && e.message) || e) }); }
    })();
  };
})();
