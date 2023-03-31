console.log('running content')
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == "getTranscript") {
      var transcript = document.querySelector(".lang-eng").textContent;
      sendResponse({transcript: transcript});
    }
  });
  