// Get the UI elements
const nameInput = document.getElementById("name-input");
const generateSummaryButton = document.getElementById("generate-summary-button");
const loadingSpinner = document.getElementById("loading-spinner");

var finalPrompt = "";
var finalSubPrompt = "";
var numResponses = 0;
var numChunks = 0;


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
        var loopPrompt = "Summarize this conversation in a paragraph. Note any specific and action items in bullet points with the name of the relevant person, following the summary paragraph: "
        console.log("now in loop #" + i);
        console.log(transcriptChunks.length);
        makeCall(loopPrompt, transcriptChunks[i]);
      }

  }

  function makeCall(loopPrompt, subprompt){
    var combinedPrompt = loopPrompt + subprompt;
    fetch("https://scai.herokuapp.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        .then(data => responseReady(data.choices[0].message.content));


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
  

  function responseReady(data){
    numResponses = numResponses + 1.0;
    console.log("responses: " + numResponses + " and numChunks: " + numChunks);

    if(numResponses < numChunks){
        finalSubPrompt = finalSubPrompt + data;
        console.log('responses less than chunks, updating final subprompt');
    }
    if(numResponses == numChunks + 1){
        console.log('responses equal chunks + 1, writing data to console');
        console.log(data);
        document.getElementById("success-message").style.display = "block";
        document.getElementById("response-text").style.display = "block";
        document.getElementById("loading-text").style.display = "none";
        document.getElementById("copy-button").style.display = "block";
        document.getElementById("loading-image").style.display = "none";

        var copyButton = document.getElementById("copy-button");
        copyButton.addEventListener("click", copyText(data));

    }
    if(numResponses == numChunks){
        console.log('responses lequal chunks, sending final request');

        var finalPrompt = "I used Chat GPT to summarize a long meeting transcript. Because the transcript was long, I had to do it in several parts. Summarize the following summary paragraphs into 2-3 paragraphs, treating each as a summary of just a part of a single longer meeting. If the input includes any 'Action Items' bullet point, repeat these in your response without modification and place them below the summary paragraphs.";

        console.log('making final call with prompt: \n ' + finalPrompt + ' and subprompt '+ finalSubPrompt + ' prompt finished');
        makeCall(finalPrompt, finalSubPrompt);
    }

  }

  function copyText(data){
    var responseTextField = document.getElementById('response-text');
    responseTextField.innerText = data;
    responseTextField.select();
    responseTextField.setSelectionRange(0, 99999);
    document.execCommand("copy");
    console.log('copying');
  }