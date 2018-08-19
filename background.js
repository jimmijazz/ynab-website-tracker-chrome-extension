
// Runs on every page. Used to interact with Chrome
chrome.runtime.onInstalled.addListener(function (object) {
  // Open the settings page on load.

  // Make request to check for token. If it doesn't exist redirect to
  chrome.tabs.create({url : "chrome-extension://jbeeknmoecnochpcldnddlbflhhingne/options.html"})();
});
globalUserId = ""
var totalRemaining = null; // Total remaining in the selected budget.
// var listOfSitesToIgnore = [".facebook.",".reddit.",".google.",".aws.",".youtube.",".baidu.",".chrome.",".wikipedia.",".twitter.",".instagram.",".vk.",".netflix.",".office.",".spotify.",".pornhub.",".xhamster.",".xnxx."]
var listOfSitesToIgnore = []; // Actually want to check these so icon can be updated.

var global_all_keywords = [];
var global_keywords_hash = {};

chrome.storage.sync.get({
  all_keywords: [],
  keywords_hash: {},
  ynabUserId : ""
}, function(items) {
  global_all_keywords = items.all_keywords;
  global_keywords_hash = items.keywords_hash;
  globalUserId = items.ynabUserId
});

function getRemainingBudget(budgetId, categoryId) {
  // Returns available budget (INT) for that month
  // Get Access Token
  jQuery.ajax({
    type: "GET",
    url: "https://ynab-website-tracker.herokuapp.com/ynab_token",
    data : {"id" : globalUserId},
    success: function(data) {
        var usertoken = data.access_token;
        var url = "https://api.youneedabudget.com/v1/budgets/" + budgetId + "/categories/" + categoryId + "?access_token="+usertoken;
        // console.log("BudgetID: ", budgetId);
        // console.log("CategoryID: ", categoryId);
        var categoryData;
        jQuery.ajax({
          type: "GET",
          url: url,
          success: function(data) {
            var categoryData = data["data"]["category"]["balance"] / 1000;
            totalRemaining = categoryData;
            console.log(data["data"])
            if (categoryData <= 0) {
              chrome.browserAction.setIcon({path : "assets/images/icon128_red.png"});
              // console.log("OVERSPEND!");
            } else {
              chrome.browserAction.setIcon({path : "assets/images/icon128_green.png"});
              // console.log(categoryData + " remaining in budget category!");
            }
          },
          error : function(data) {
            console.log(data);
          }
        });
      },
    error : function(error) {
      console.log(error);
    }
  });
};

function checkIfKeyWordExists(websiteKeywords) {
  // console.log(websiteKeywords);
  // console.log(global_keywords_hash)
  // console.log(global_all_keywords)
  var websiteKeywordsArray = websiteKeywords.split(' ');
  for (var key in websiteKeywordsArray) {
    var s = websiteKeywordsArray[key].toLowerCase().trim().replace(",","").replace(".","")
    if (global_all_keywords.indexOf(s) > -1) {
      // console.log(true); // in budget keyword array
      // console.log(s); // For debugging
      for (var i in global_keywords_hash) {
        if (global_keywords_hash[i].indexOf(s) > -1) {
          // Currently only returns the first instance. In the future should give weighting to number of keywords that match
          var budgetId = i;
          getRemainingBudget(global_keywords_hash["budget_id"],i )
          // TODO: Get budget allowance for i
        } else {
          // console.log(false);
        }
      };
    } else {
      // Keywords don't exist
      chrome.browserAction.setIcon({path : "assets/images/icon128_default.png"});
      // console.log(false);
    }
  }
};
// On icon click
chrome.browserAction.onClicked.addListener(function(tab) {
  if(totalRemaining !== null) {
    if (totalRemaining < 0) {
      var s = String(totalRemaining).replace('-', "");
      alert("You have -$" + totalRemaining + " remaining for this budget category.");
    } else {
      alert ("You have $ " + totalRemaining + " remaining for this budget category.");
    }
  }
});


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    totalRemaining = null;

    // console.log('message recieved');
    // console.log('recieved');
    chrome.browserAction.setIcon({path : "assets/images/icon128_default.png"});

    if (request.keywords) {
      // console.log(request); // Keywords sent

      checkIfKeyWordExists(request.keywords);
    } else if(request.budget) {
    } else {
      // console.log('no keywords'); // Shouldn't happen.
    }
});

// When tab switched
chrome.tabs.onActivated.addListener(function(activeInfo) {
  totalRemaining = null;
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
         chrome.tabs.sendMessage(activeInfo.tabId,
          { greeting: "hello" }, function(response) {
            // console.log(response);
       });
    });
});
// Listen for any tab updates (means it will work when a tab is created or switched)
chrome.tabs.onUpdated.addListener(function(activeInfo) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
         chrome.tabs.sendMessage(activeInfo,
          { greeting: "hello" });
    });
});
