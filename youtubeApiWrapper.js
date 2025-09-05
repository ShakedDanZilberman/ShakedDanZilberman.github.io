var scriptUrl = 'https:\/\/www.youtube.com\/s\/player\/79e70f61\/www-widgetapi.vflset\/www-widgetapi.js';
try {
    var ttPolicy = window.trustedTypes.createPolicy("youtube-widget-api", { createScriptURL: function (x) { return x } });
    scriptUrl = ttPolicy.createScriptURL(scriptUrl)
} catch (e) { }
var YT;
if (!window["YT"])
    YT = { loading: 0, loaded: 0 };
var YTConfig;
if (!window["YTConfig"])
    YTConfig = { "host": "https://www.youtube.com" };
if (!YT.loading) {
    YT.loading = 1; (function () {
        var l = [];
        YT.ready = function (f) {
            if (YT.loaded) f(); else l.push(f)
        };
        window.onYTReady = function () {
            YT.loaded = 1;
            var i = 0;
            for (; i < l.length; i++) try { l[i]() } catch (e) { }
        };
        YT.setConfig = function (c) {
            var k;
            for (k in c) if (c.hasOwnProperty(k)) YTConfig[k] = c[k]
        };
        var a = document.createElement("script");
        a.type = "text/javascript";
        a.id = "www-widgetapi-script";
        a.src = scriptUrl;
        a.async = true;
        var c = document.currentScript;
        if (c) {
            var n = c.nonce || c.getAttribute("nonce");
            if (n) a.setAttribute("nonce", n)
        }
        var b = document.getElementsByTagName("script")[0];
        b.parentNode.insertBefore(a, b)
    })()
};

// Fired when the YouTube API script is loaded
console.log("YouTube IFrame API is ready.");
// --- helpers ---
function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
}

// --- state ---
let player = null;
let apiReady = false;
let queuedCalls = [];

// Called by YouTube when the IFrame API is ready
function onYouTubeIframeAPIReady() {
    apiReady = true;

    // Create the hidden player once
    player = new YT.Player("hidden-player", {
        events: {
            onReady: () => {
                // Flush any queued calls
                queuedCalls.forEach(({ id, cb }) => processRequest(id, cb));
                queuedCalls = [];
            }
        }
    });
}

// --- main function ---
export default function getYouTubeDuration(videoId, callback) {
    if (!apiReady || !player) {
        // Queue until ready
        queuedCalls.push({ id: videoId, cb: callback });
        return;
    }
    processRequest(videoId, callback);
}

function processRequest(videoId, callback) {
    player.cueVideoById(videoId);

    const checkDuration = () => {
        const seconds = player.getDuration();
        if (seconds && seconds > 0) {
            callback(formatDuration(seconds), seconds);
        } else {
            setTimeout(checkDuration, 100);
        }
    };
    checkDuration();
}