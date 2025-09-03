chrome.runtime.onInstalled.addListener((details)=>{
  const defaults = {
    theme: "light",
    lang: "en",
    blockedVideosMap: {},
    zapStats: {},
    keywords: []
  };
  chrome.storage.sync.get(defaults, (d)=>{
    chrome.storage.sync.set(d);
  });
});

// Clicking the toolbar icon opens dashboard
chrome.action.onClicked.addListener(()=>{
  chrome.runtime.openOptionsPage();
});