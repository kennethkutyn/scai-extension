// Get the UI elements
const nameInput = document.getElementById("name-input");
const generateSummaryButton = document.getElementById("generate-summary-button");
const loadingSpinner = document.getElementById("loading-spinner");

var finalPrompt = "";
var finalSubPrompt = "";
var numResponses = 0;
var numChunks = 0;
var finalActionsString = "";
var finalSummaryString = "";


document.addEventListener("DOMContentLoaded", function () {
    var generateButton = document.getElementById("generate-summary-button");
    generateButton.addEventListener("click", generateSummary);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.executeScript(tabs[0].id, { file: "content.js" }, function (response) {
        });
      });

  });



  

function generateSummary() {
    document.getElementById("generate-summary-button").style.display = "none";
    // Get the current tab's URL

    chrome.tabs.getSelected(null,function(tab) {
        var tablink = tab.url;
        console.log(tablink);
    });


    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var url = tabs[0].url;
        console.log(url);
      // Check if the URL contains "amplitude.gong.io/call/pretty-transcript"
      if (url.toString().includes("amplitude.app.gong.io/call/pretty-transcript")) {
        // Display loading animation
        document.getElementById("loading").style.display = "inline-block";
        document.getElementById("loading-text").style.display = "block";
        document.getElementById("loading-image").style.display = "block";
        console.log('url is ok, sending message to content.js');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getTranscript"}, function(response) {
                splitStringAndPrepCalls(response.transcript);

            });
          });
        
      } else {
        // Display error message
        console.log('url is wrong');
        document.getElementById("success-message").textContent = "This extension can't run on this page. Please navigate to the transcript page of the call by clicking the '...' menu button on the Gong call page, then choosing 'View Transcript'.";
        document.getElementById("success-message").style.display = "block";

      }

    });
  }
  


  function splitStringAndPrepCalls(transcript) {
      
      var transcriptChunks = splitStringIntoChunks(transcript);
      numChunks = transcriptChunks.length;
      console.log('setting numChunks to ' + numChunks);
      for (let i = 0; i < transcriptChunks.length; i++) {
        var summaryPrompt = "Summarize this sales conversation between Amplitude and a prospective customer in a paragraph. Mention any specific amplitude features that were discussed. Mention the prospect's business requirements that were discuss and any timeline for meeting those requirements, if any. Mention any 3rd party technologies that the prospect is using already or considering using, if any. Avoid any introductory text such as 'this is a sales conversation between amplitude and a prospect'";
        var actionsPrompt = "Extract any action items from this sales conversation between Amplitude and a prospective customer and restate them in bullet points. Do not include any additional text before or or after the bullet points."
        console.log("now in loop #" + i);
        console.log(transcriptChunks.length);
        makeCall(summaryPrompt, transcriptChunks[i], "summary");
        //makeCall(actionsPrompt, transcriptChunks[i], "actions");
      }

  }

  function makeCall(contextPrompt, transcriptChunk, type){
    var combinedPrompt = contextPrompt + transcriptChunk;
    fetch("https://scai.herokuapp.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "type": "AI"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {"role": "user", "content": combinedPrompt}
          ],
          max_tokens: 1000,
          temperature: 0.7
        }),
      })
      .then(response => response.json())
        .then(data => responseReady(data.choices[0].message.content, type));


          // Remove loading animation
        //  document.getElementById("loading").style.display = "none";

          // Display success message
          //document.getElementById("message").textContent =
           // "Done. Your summary is copied to your clipboard.";

          // Copy summary to clipboard
          //var summary = data.choices[0].text.trim();
          //navigator.clipboard.writeText(summary);
        //});
  }

  function splitStringIntoChunks(str) {
    const chunkSize = 10000;
    const regex = new RegExp(`[^]{1,${chunkSize}}`, 'g');
    const chunks = str.match(regex);
    console.log(`Split the string into ${chunks.length} chunks:`);
    return chunks;
  }
  

  function responseReady(data, type){
    numResponses = numResponses + 1.0;
    console.log("responses: " + numResponses + " and numChunks: " + numChunks);    
    /*if (type == "actions"){
      finalActionsString = finalActionsString + data;
      console.log('finalActions String: ' + finalActionsString);
    }*/

    /*if (type == "summary"){
      finalSummaryString = finalSummaryString + data + '\n\n';
    }*/

    if(numResponses < numChunks){
        finalSummaryString = finalSummaryString + data;
        console.log('responses less than chunks, updating final summary string');
    }

    if(numResponses == numChunks + 1){
        //console.log('Actions: ' + finalActionsString);
        //console.log('Summary: ' + finalSummaryString);
        document.getElementById("success-message").style.display = "block";
        document.getElementById("summary-text").style.display = "block";
        //document.getElementById("action-text").style.display = "block";
        document.getElementById("loading-text").style.display = "none";
        //document.getElementById("action-copy-button").style.display = "block";
        document.getElementById("summary-copy-button").style.display = "block";
        document.getElementById("loading-image").style.display = "none";

        var summaryTextField = document.getElementById('summary-text');
        //var actionTextField = document.getElementById('action-text');
        summaryTextField.innerHTML = data;
        //actionTextField.innerHTML = finalActionsString;


        var summaryCopyButton = document.getElementById("summary-copy-button");
        //var actionCopyButton = document.getElementById("action-copy-button");
        summaryCopyButton.addEventListener("click", summaryCopyText);
        //actionCopyButton.addEventListener("click", actionCopyText);


    }
    if(numResponses == numChunks){
        console.log('responses lequal chunks, sending final request');

        var finalPrompt = "I'm going to provide you with a block of text that summarizes a single sales call between Amplitude and a prospect. I want you to extract the following information and return it to me in bullet points in the following sections. You can have 1 or more bullet points per section:\n" +
        "1. 3rd party technologies the customer is already using or planning to use\n" +
        "2. Software that competes with Amplitude the prospect is considering as an alternative\n" +
        "3. Any timeline that was dicussed for the customer to make a deicison or start implementation\n" +
        "4. Any busuiness requiments or needs of the prospect\n" +
        "5. What are the most important features of Amplitude for the prospect\n" +
        "6. What concerns or hesitations does the customer have about using Amplitude\n" +
        "7. What are the next steps agreed upon for this sales opportunity. \n" +
        
        "Here is the block of text: \n";

        console.log('making final call with prompt: \n ' + finalPrompt + ' and finalSummaryString '+ finalSummaryString + ' prompt finished');
        makeCall(finalPrompt, finalSummaryString);
    }

  }

  function summaryCopyText(){
    console.log('copying summary');
    var summaryCopyButton = document.getElementById("summary-copy-button");
    summaryCopyButton.innerHTML = "Summary Copied!";
    var summaryTextField = document.getElementById('summary-text');
    summaryTextField.select();
    summaryTextField.setSelectionRange(0, 99999);
    document.execCommand("copy");
  }

  /*function actionCopyText(){
    console.log('copying actions');
    var actionCopyButton = document.getElementById("action-copy-button");
    actionCopyButton.innerHTML = "Action Items Copied!";
    var actionTextField = document.getElementById('action-text');
    actionTextField.select();
    actionTextField.setSelectionRange(0, 99999);
    document.execCommand("copy");
  }*/