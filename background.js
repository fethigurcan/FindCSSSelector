var default_icon= {path:{
    "16": "disabled16.png",
    "32": "disabled32.png",
    "48": "disabled48.png",
    "128": "disabled128.png"
}};      

var active_icon= {path:{
      "16": "icon16.png",
      "32": "icon32.png",
      "48": "icon48.png",
      "128": "icon128.png"
}};


chrome.browserAction.onClicked.addListener(function(){
	chrome.tabs.query(
	  {currentWindow: true, active : true},
	  function(tabs){
	  	console.log('send sendMessage');
	  	const port = chrome.tabs.connect(tabs[0].id);
		port.onMessage.addListener((response) => {
			console.log('message received');
			icondata=response.status?active_icon:default_icon;
		  	icondata.tabId=tabs[0].id;
			chrome.browserAction.setIcon(icondata);			
	    });	  	
	    port.postMessage({action: "toggleCssScan"});
	  }
	);
})