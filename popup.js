// Get the UI elements
const nameInput = document.getElementById("name-input");
const generateSummaryButton = document.getElementById("generate-summary-button");
const loadingSpinner = document.getElementById("loading-spinner");
var sessionId = Math.random()*1000000000;
console.log('session ID = ' + sessionId);


document.addEventListener("DOMContentLoaded", function () {
    var generateButton = document.getElementById("generate-summary-button");
    generateButton.addEventListener("click", generateSummary);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.executeScript(tabs[0].id, { file: "content.js" }, function (response) {
          console.log(response);
          // handle response here
        });
      });

  });
  

function generateSummary() {
    // Get the current tab's URL

    chrome.tabs.getSelected(null,function(tab) {
        var tablink = tab.url;
        console.log(tablink);
    });


    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var url = tabs[0].url;
      // Check if the URL contains "gong.io/call/pretty-transcript"
      if (url.toString().includes("gong.io/call/pretty-transcript")) {
        // Display loading animation
        document.getElementById("loading").style.display = "inline-block";
        console.log('url is ok, sending message to content.js');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getTranscript"}, function(response) {
                splitStringAndPrepCalls(response.transcript);

            });
          });
        
      } else {
        // Display error message
        document.getElementById("message").textContent =
          'Please navigate to the transcript page of this call by clicking the "..." menu button then choosing "View Transcript".';
      }
    });
  }
  





  function splitStringAndPrepCalls(transcript) {
    // Send request to Chat GPT API
      
      var transcriptChunks = splitStringIntoChunks(transcript);
      for (let i = 0; i < 50; i++) {
        var loopPrompt = "remember this conversation, i'll ask you to summarize it with other dialog later. Dont' summarize it yet. Reply only with the word 'yes'"
        makeCall(loopPrompt, transcriptChunks[i])
        if (i == 49){
            makeCall("please summarize the conversation. Include a paragraph about the overall conversation, bullet points for action items and", " next steps");
        }
      }
      
    
    

  }

  function makeCall(loopPrompt, context){
    var prompt = loopPrompt + context;
    
    fetch("https://scai.herokuapp.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          prompt: prompt,
          max_tokens: 1000,
          temperature: 0.7,
          context: `Session ID: ${sessionId}` 
        }),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
            console.log(data.choices[0].text);

          // Remove loading animation
          document.getElementById("loading").style.display = "none";

          // Display success message
          //document.getElementById("message").textContent =
           // "Done. Your summary is copied to your clipboard.";

          // Copy summary to clipboard
          //var summary = data.choices[0].text.trim();
          //navigator.clipboard.writeText(summary);
        });
  }

  function splitStringIntoChunks(str) {
    const chunkSize = 10000;
    const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
    const chunks = str.match(regex);
    console.log(`Split the string into ${chunks.length} chunks:`);
    console.log(chunks);
    return chunks;
  }