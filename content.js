var lastEl,lastActualEl;
var lastShift=false;
const markerCss='FindCSSSelector-targetItem';
const actualmarkerCss='FindCSSSelector-actualItem';
var isScanning=false;
var inIFrame=window.self !== window.top;

function keypressEventListener(e){
	if (window.opener!=null){
		if (e.shiftKey && e.ctrlKey && e.code=="KeyS"){
			if (!isScanning){
				startScan();		
			}else{
				stopScan();
			}
		}
	}
	if (e.shiftKey && e.ctrlKey && e.code=="KeyA"){
		FindCSSSelector.scanAllUserControls();
	}
}


function isChildOf(el,parentEl){
	let e=el;
	do{
		if (e==parentEl)
			return true;
		else
			e=e.parentElement;
	}while(e);
}

function mouseMoveEventListener(e){
	let actualEl=document.elementFromPoint(e.clientX,e.clientY);
	if (outputdiv){
		latestInnerX=e.screenX-e.clientX;
		latestInnerY=e.screenY-e.clientY;
		outputdiv.style.left=(e.pageX+10)+'px';
		outputdiv.style.top=(e.pageY+10)+'px';
	}else if (inIFrame && isScanning){
		window.parent.postMessage({ type:'mousemove',x:e.screenX,y:e.screenY },"*");
	}

	//console.log(inIFrame,e.clientX,e.clientY);
	if (actualEl && e.shiftKey){
		let el=FindCSSSelector.findParentWithId(actualEl);
		if (isChildOf(actualEl,outputdiv)){ //kendi eklediklerimiz inceleme dışı
			actualEl=null;
			el=null;
		}
			

		if ((lastActualEl!=actualEl)||(lastShift!=e.shiftKey)){

			if (lastActualEl)
				lastActualEl.classList.remove(actualmarkerCss);

			if (actualEl)
				actualEl.classList.add(actualmarkerCss);
			
			lastActualEl=actualEl;

			if (lastEl!=el){
				

				if (lastEl)
					lastEl.classList.remove(markerCss);

				if (el)
					el.classList.add(markerCss);

				lastEl=el;

			}
			lastShift=e.shiftKey;
			if (actualEl && e.shiftKey){
				let selectorResult=FindCSSSelector.findcssSelector(el,actualEl);
				if (selectorResult && selectorResult.cssSelector){
					if (inIFrame){
						window.parent.postMessage({ type:'cssSelectorFound',cssSelector:selectorResult.cssSelector,specifity:selectorResult.specifity,calculationTimeElapsed:selectorResult.calculationTimeElapsed,cssSelectorTimeElapsed:selectorResult.cssSelectorTimeElapsed,info:getFrameInfo() },"*");
					}else{
						textelement.innerText=selectorResult.cssSelector;
						infoelement.innerText="("+selectorResult.specifity+")";
						copyToClipboard();
					}
				}
			}
		}
	}
}

var outputdiv;
var textelement;
var infoelement;
var latestInnerX=0,latestInnerY=0;

function copyToClipboard(){
  	document.execCommand("copy");
}

document.addEventListener('copy', function(e) {
  if (textelement){
	var textToPutOnClipboard = textelement.innerText;
	e.clipboardData.setData('text/plain', textToPutOnClipboard);
	e.preventDefault();
  }
});


window.addEventListener("message", receiveMessage, false);
document.addEventListener('keypress',keypressEventListener);

if (inIFrame){
	window.parent.postMessage({ type:'isParentScanning' },"*");
}


function getFrameInfo(parentInfo){
	let baseInfo;
	if (window.frameElement){
		baseInfo=(window.frameElement.getAttribute('id')&&!FindCSSSelector.idExcludeRegex.test(window.frameElement.getAttribute('id')))?'#'+window.frameElement.getAttribute('id'):'src='+window.frameElement.getAttribute('src');
	}else{
		baseInfo=document.location.href;
	}
	if (parentInfo)
		baseInfo+=' (IFRAME '+parentInfo+')';
	return baseInfo;
}

function receiveMessage(e) {
	if (e.data){
		if (e.data.type=='cssSelectorFound'){
			let cssSelector=e.data.cssSelector;
			let specifity=e.data.specifity;
			if (inIFrame){
				window.parent.postMessage({ type:'cssSelectorFound',cssSelector:cssSelector, specifity:specifity,calculationTimeElapsed:e.data.calculationTimeElapsed,cssSelectorTimeElapsed:e.data.cssSelectorTimeElapsed, info:getFrameInfo(e.data.info) },"*");
			}else{
				textelement.innerText=cssSelector;
				infoelement.innerText='('+specifity+')(IFRAME '+e.data.info+') -> ';
				copyToClipboard();
			}
		}else if(e.data.type=='isParentScanning'){
			if(e.source)
				e.source.postMessage({ type:'parentScanStatus',isScanning:isScanning },"*");
		}else if(e.data.type=='parentScanStatus'){
			if (e.data.isScanning!=isScanning)
				if (e.data.isScanning)
					startScan();
				else
					stopScan();
		}else if(e.data.type=='mousemove'){
			if (inIFrame)
				window.parent.postMessage(e.data,"*");
			else if (outputdiv){
				outputdiv.style.left=(document.scrollingElement.scrollLeft-latestInnerX+e.data.x+10)+'px';
				outputdiv.style.top=(document.scrollingElement.scrollTop-latestInnerY+e.data.y+10)+'px'; 		
			}

		}
	}
}

function startScan(){
	isScanning=true;
	FindCSSSelector.cssSelect('iframe').map((f) => f.classList.add('FindCSSSelector-iframe'));
	if (!inIFrame){
		outputdiv = document.createElement('div');
		outputdiv.classList.add('FindCSSSelector-div');
		infoelement = document.createElement('span');
		outputdiv.appendChild(infoelement);
		infoelement.classList.add('FindCSSSelector-info');
		textelement = document.createElement('span');
		outputdiv.appendChild(textelement);
		textelement.classList.add('FindCSSSelector-text');
		/*var buttonelement = document.createElement('button');
		buttonelement.innerText='Kopyala';
		outputdiv.appendChild(buttonelement);
		buttonelement.classList.add('FindCSSSelector-button');
		buttonelement.addEventListener('click',copyToClipboard);*/
		document.body.appendChild(outputdiv);
	}
	document.addEventListener('mousemove',mouseMoveEventListener); 	
}

function stopScan(){
	isScanning=false;
	FindCSSSelector.cssSelect('iframe').map((f) => f.classList.remove('FindCSSSelector-iframe'));
	document.removeEventListener('mousemove',mouseMoveEventListener);
	if (!inIFrame)
		document.body.removeChild(outputdiv);
	outputdiv=null;
	textelement=null;
	if (lastActualEl)
		lastActualEl.classList.remove(actualmarkerCss);
	if (lastEl)
		lastEl.classList.remove(markerCss);
	lastEl=null;
	lastActualEl=null;
}

function injectScript(file_path, tag) {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}
injectScript(chrome.extension.getURL('helper.js'), 'body');
injectScript(chrome.extension.getURL('site.js'), 'body');

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg.action == 'toggleCssScan') {
      if (!isScanning){
		  startScan();		
      }else{
		  stopScan();
      }
      port.postMessage({ status: isScanning },"*");
    }else if (msg.action == 'isCssScanning') {
      port.postMessage({ status: isScanning },"*");
	}
  });
});


