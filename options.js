
// Get the user's budgets
var globalUserId = "";
globalAccessToken = "";
function getUserToken() {

  // Clear storage for testing
  //TODO : this is still being manually set.
  chrome.storage.sync.set({
    ynabUserId : "" // User ID was manually set and removed for public
  });

  chrome.identity.getProfileUserInfo(function(info) {
    // First check if user ID exists
    chrome.storage.sync.get({
      ynabUserId: "",
    }, function(items) {
      if (!items.ynabUserId || items.ynabUserId == null || items.ynabUserId == "") {
        // User ID not in local storage, so have to re-authorize
        $("#authorize").show();
        $(".lds-roller").hide();

      } else {
        // Get the user's token
        jQuery.ajax({
          type: "GET",
          url: "https://ynab-website-tracker.herokuapp.com/ynab_token",
          data : {"id" : items.ynabUserId},
          success: function(data) {
            if (data["user_id"]) {
              // User is new. Their user ID is returned so store in local storage
              chrome.storage.sync.set({
                ynabUserId : data.user_id
              });
              globalUserId = data.user_id;
              globalAccessToken = data.access_token;
              getBudget();

            } else {
              // An error happened. Maybe they weren't found in the database, so re-authorize
              $("#authorize").show();
              $(".lds-roller").hide();

            }
            // console.log(data);
            // console.log(data);
          },
          error : function(data) {
            $("#authorize").show()
            $(".lds-roller").hide();

          }
        });
      }
    });
    // First check if user ID exists
    chrome.storage.sync.get({
      ynabUserId: "",

    }, function(items) {
      // console.log(items);
    });
  });
};

var global_all_keywords = [];
var global_keywords_hash = {};

function getBudget() {
  jQuery.ajax({
    type: "GET",
    data : {id : globalUserId},
    url: "https://ynab-website-tracker.herokuapp.com/ynab_budgets/",
    success: function(data) {
      // console.log(data);
      loadBudgetsIntoTable(data["budgets"]);
    },
    error : function(data) {
      console.log(data);

    }
  });
};

// Handles loading and displaying of budget on options page
function loadBudgetsIntoTable(budgets) {
  // console.log(global_all_keywords);
  // console.log(global_keywords_hash);
  $("#title").show();
  $("#helpText").show();
  $(".lds-roller").hide();

    $(budgets).each(function(e){
      // console.log(e)

      $("#budgetsTable").append("<tr data-budget-id="+budgets[e]["id"] + " class='budgetRow'><td class='tableCellButton'>"+budgets[e]["name"]+"</td></tr>")
    });

    $('.budgetRow').on('click', function(b) {
      $("#helper_text").show();
      $("#budgetsTable").hide();
      $('#selectBudgetText').html("Below is the balance you have for each category. You can track specific keywords for each category by entering them in the appropriate input, seperated by comma's.</br></br>Eg: If you're shopping for furniture, you might enter 'couch, chair, furniture' in your furniture category. Anytime one of these keywords is detected on a website, the icon will change to red or green depending on if you've overspent in that budget category.");
      $(".lds-roller").show();
      $("#title").text("Keyword Select")

        var budgetId = $(this).data("budget-id");
        var url = "https://api.youneedabudget.com/v1/budgets/" + budgetId + "/categories?access_token="+globalAccessToken;
        $.ajax({
          method: "GET",
          url: url
        }).done(function(data) {
          $("#save").show();
          $(".lds-roller").hide();
          $("#helpText").show();


          // console.log(data);
        // Add to categories table
        $('#categoriesTable').find("tr").remove();
        $("#categoriesTable > tbody").append("<tr id='header_row' data-table-budget-id="+budgetId+"></tr>");
        $(data["data"]["category_groups"]).each(function(i) {
          if (i > 0) {  // Ignore first one since it is internal budget categories used by YNAB
            var c = data["data"]["category_groups"][i]["categories"];
            if (c.length > 0) { // Add title if there us actually anything budgeted
              $("#categoriesTable").append("<tr class='category_header_row'><td>"+data["data"]["category_groups"][i]["name"]+"</td><td>Budgeted</><td>Balance</></td><td>Keywords</td></tr>");
            };
            $(c).each(function(ii) {
              var cName = data["data"]["category_groups"][i]["categories"][ii]["name"];
              var cBudgeted = data["data"]["category_groups"][i]["categories"][ii]["budgeted"]; // How much has been budgeted for that month
              var cBalance = data["data"]["category_groups"][i]["categories"][ii]["balance"]; // How much has been budgeted for that month

              var cId = data["data"]["category_groups"][i]["categories"][ii]['id'];
              var inputInitValue = "";

              $("#categoriesTable").append("<tr class='category_row'><td>" + cName + "</td><td>$" + cBudgeted / 1000 + "</td><td>$" + cBalance / 1000 + "</td><td><input id="+ cId + " + class='keyword_input' type='text'></input></td></tr>");
              if(global_keywords_hash.length !== 0 && cId in global_keywords_hash ) {
                $("#"+cId).val(global_keywords_hash[cId]);
              } else {
                // console.log(false)
              }
            });

          }

        });
      })
    });
};
// Saves options to chrome.storage
function save_options() {

  var all_keywords = [];   // Contains full set of array to quickly see if keyword actually exists.
  var keywords = {};  // Contains dictionary to see which category keyword belongs to.
  keywords["budget_id"] = $('#header_row').data('table-budget-id');
  $('#categoriesTable > tbody > tr').each(function() {
    var input = $(this).find(".keyword_input").map(function() {
      var rawKeywordsArray = $(this).val().split(",");
      for (var k = 0; k < rawKeywordsArray.length; k++) {
        var formattedKeyWord = rawKeywordsArray[k].trim();
        rawKeywordsArray[k] = formattedKeyWord;
        // Also add to list of keywords to quickly check without looping over
        // entire hash. TODO: smarter way of combining these arrays together.
        if (formattedKeyWord !== "") {
          all_keywords.push(formattedKeyWord);
        };
      };

      keywords[$(this).attr('id')] = rawKeywordsArray;

    });
  });

  chrome.storage.sync.set({
    all_keywords: all_keywords,
    keywords_hash: keywords
  }, function() {

    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    all_keywords: [],
    keywords_hash: {}
  }, function(items) {
    global_all_keywords = items.all_keywords;
    global_keywords_hash = items.keywords_hash;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
$(document).ready(function() {
  $("#authorize").hide();
  $("#helper_text").hide();
  $("#helpText").hide();
  $("#title").hide();
  $("#save").hide();
  getUserToken();
});
