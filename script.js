// Runs on client side (on every website except those excluded)

// Send a message to the background. Normally this would just happen directly
// in the background file, but for some reason exclusions weren't working
// chrome.runtime.sendMessage({"message" : "hello"});

chrome.runtime.onMessage.addListener(function(msg){
  $(document).ready(function() {
    var keywords = $('meta[name=keywords]').attr("content");
    console.log(keywords);
    if (keywords == undefined) {
      var keywords = $('meta[name=description]').attr("content");
      if (keywords == undefined) {
        var keywords = $('meta[name=Description]').attr("content");
      };
    };

    var k = String(keywords);
    chrome.runtime.sendMessage({"keywords" : k});
  });
});
