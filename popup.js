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
        var loopPrompt = "Summarize this sales conversation in a paragraph. Mention any specific amplitude features that were discussed and whether the prospect seemed interested in them. Mention any 3rd party technologies that the prospect is using already or considering using. Mention any questions the prospect asked that the Amplitude attendees were unable to answer and said they would follow up, including which person asked the question. Note any specific action items in bullet points with the name of the relevant person, following the summary paragraph: "
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

        var finalPrompt = "The following are several summaries from a single sales conversation between Amplitude and a prospective customer. First, list all action items in bullet points. Then, summarize the paragraphs into 1 paragraph about what Amplitude features were discussed, 1 paragraph about the customers business needs and requirements and 1 paragraph about next steps."

        console.log('making final call with prompt: \n ' + finalPrompt + ' and subprompt '+ finalSubPrompt + ' prompt finished');
        makeCall(finalPrompt, finalSubPrompt);
    }

  }

  function copyText(data){
    var responseTextField = document.getElementById('response-text');
    var myLineBreak = data.replace(/\r\n|\r|\n/g,"</br>");
    responseTextField.innerText = myLineBreak;
    responseTextField.select();
    responseTextField.setSelectionRange(0, 99999);
    document.execCommand("copy");
  }