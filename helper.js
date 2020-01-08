FindCSSSelector={
    cssImortantRegex:/-grid$|-row$|-col[0-9]*$|-window$/, //bazı css patternlerine hem diğer class lardan hem de tagName'den daha yüksek öncelik vermek iyi bir fikir. (mesela ext-window)
    cssExcludeRegex:/^FindCSSSelector-|-collapsed$|-expanded$|-over$|-hover$|-[0-9]{2,}$/, //exclude ya da tersini mi yapmak daha mantıklı bilemedim ilk aşamada. oluşan efora göre bakmalı
    idExcludeRegex:/^ext-|[0-9]{2,}$/, //sonu birkac basamakli sayi ise ignore et
    elementAttributesWhitelist:['name','src','href','title'], //sıralama önemli
    userControlsCSSSelector:'INPUT,SELECT,TEXTAREA,BUTTON,A[href],BODY IFRAME,*[onclick],*[ondblclick],*[onmousedown],*[onmouseup],*[contenteditable=true]',
    problematicDetectionRegex:/^((?!^[A-Z][A-Z0-9]*(\[(id|href|name)=|[#.])).)+|of-type/, //şu anda id ile başlamayan ya da of-type selectoru içerenler.

    findParentWithId:function(el){
        if(!el.tagName){
            debugger;	
            return document.body;
        }if (el.tagName=="HTML" || el.tagName=="BODY")
            return el;
        else if (el.id && el.id!='' && !FindCSSSelector.idExcludeRegex.test(el.id) && FindCSSSelector.cssSelect(FindCSSSelector.getIdSelector(el)).length==1) //sondaki kontrol olmaması gereken ama olabilen aynı id'ye sahip nesnelerin id ile kullanılmasını engeller.
            return el;
        else
            if (el.parentElement)
                return FindCSSSelector.findParentWithId(el.parentElement);
            else
                return null;
    },

    logBuggyUnmatchedSingleOrNoResult:function (position,elTarget,cssSelector,elFound){
        console.log('Error: Tebrikler! Bir bug buldunuz.');
        console.log('--- ('+position+')');
        console.log('css Selector: '+cssSelector);
        console.log('Hedef:');
        console.log(elTarget);
        console.log('Bulunan:'+(elFound?'':' Yok'));
        if (elFound)
            console.log(elFound);
    },

    cssSelect:function (cssSelector){
        let timeElapsed=Date.now();
        let retVal;
        if (cssSelector)
            retVal=[...document.querySelectorAll(cssSelector)];
        else
            retVal=[];
        retVal.timeElapsed=Date.now()-timeElapsed;
        return retVal;
    },  

    getIdSelector:function (el){
        if (!/[\\\"\/#:;,.&]|^[0-9]/.test(el.id)) //buradaki karakter seti spesifikasyona bakılarak düzeltilebilir ancak şimdilik bunlar iyi gibi.
            return el.tagName+'#'+el.id;
        else
        return el.tagName+"[id=\""+el.id.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+"\"]"; //içinde slash(/) olan id ler başka türlü seçilemiyor (bkz. google ads divs)
    },

    findcssSelector:function (el,actualEl,elHistory){
        let findTimeElapsed=Date.now();
        let cssSelector;
        let timeElapsed;
        let specifity=0;
        let result;
        let bugPosition='findcssSelector';
        if (actualEl.tagName=="HTML" || actualEl.tagName=="BODY"){
            cssSelector=actualEl.tagName;
        }
        else if (el==actualEl){ //kendisi de olabilir
            if (el)
                if (el.id){
                    cssSelector=FindCSSSelector.getIdSelector(el);
                    specifity=101;
                }
                else{
                    debugger; //bu bir hataya işaret eder.
                    cssSelector=el.tagName;
                    specifity=1;
                }
            result=FindCSSSelector.cssSelect(cssSelector); //Not: cok basit bir yer olsa da asagidaki güvenlik kontrolü için yapılıyor.
            timeElapsed=result.timeElapsed;
        }else{
            let basePath='';
            let baseSpecifity=0;
            if (el){
                if (el.tagName=="HTML" || el.tagName=="BODY"){
                    basePath="";
                    baseSpecifity=0;
                }else if (el.id){
                    basePath=FindCSSSelector.getIdSelector(el)+' ';
                    baseSpecifity=100; //id selector
                }else{
                    basePath=el.tagName+' ';
                    baseSpecifity=1; //tag selector
                }
            }
            let found=false;

            function checkByCss(pBasePath,pEl,pBugPosition){
                pBugPosition = pBugPosition || 'checkByCss';

                //TODO: classList i bir array a doldurup en başa '' (boş string) öğesi ekle
                //üsttekini yaptıktan sonra tag temelli tarama buraya geçeceği
                //için diğer kodlardan kurtul ve sadeleştir.
                let classList=['']; 
                for(let i=0;i<pEl.classList.length;i++){
                    let className=pEl.classList.item(i);
                    if (!FindCSSSelector.cssExcludeRegex.test(className))
                        classList.push(className.replace(/:/g,'\\:'));
                }

                //öncelikli class lar diğerlerinin önüne geçsin. kendi aralarında bir öncelik yoktur, eklenme sırasına göre sıralanır ancak bu da mantığa uygun esasen.
                classList.sort((a,b) => FindCSSSelector.cssImortantRegex.test(b)-FindCSSSelector.cssImortantRegex.test(a));

                for(let i=0;i<classList.length;i++){
                    let className=classList[i];
                    let localCssSelector=pBasePath+pEl.tagName;
                    if (className)
                        localCssSelector+='.'+className;

                    result=FindCSSSelector.cssSelect(localCssSelector);
                    timeElapsed=result.timeElapsed;
                    bugPosition=pBugPosition;						
                    if (result.length==1){ //bu iş görür
                        cssSelector=localCssSelector;
                        specifity=baseSpecifity+((className)?11:1); //class selector or tag selector
                        found=true;
                        break;
                    }else if (result.length==0){ //asla 0 olmamalı demek ki bug var.
                        cssSelector=localCssSelector;					
                        break;
                    }
                }

                if (!found && result.length>1){ //attribute selectorlar devreye girer.
                    for(let i=0;i<classList.length;i++){
                        let className=classList[i];
                        let localCssSelector=pBasePath+pEl.tagName;
                        if (className)
                            localCssSelector+='.'+className;
                        for(let j=0;j<FindCSSSelector.elementAttributesWhitelist.length;j++){
                            let attr=FindCSSSelector.elementAttributesWhitelist[j];
                            let value=pEl.getAttribute(attr);
                            if (value){
                                localCssSelectorAttr=localCssSelector+'['+attr+'="'+value.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"]'; //TODO: Do CSS attribute select escape chars
                                result=FindCSSSelector.cssSelect(localCssSelectorAttr);
                                timeElapsed=result.timeElapsed;
                                bugPosition=pBugPosition;						
                                if (result.length==1){ //bu iş görür
                                    cssSelector=localCssSelectorAttr;
                                    specifity=baseSpecifity+((className)?20:11); //class+attribute selector or tag+attribute selector
                                    found=true;								
                                    break;
                                }else if (result.length==0){ //asla 0 olmamalı demek ki bug var.
                                    cssSelector=localCssSelectorAttr;							
                                    break;
                                }
                            }
                        }
                        if(found)
                            break;
                    }
                }
            }

            checkByCss(basePath,actualEl,'İlk Css Unique Check');

            if (!found){ //evet class isimlerinden de unique bir şey sağlayamadık.
                let parentOfActualEl=actualEl.parentElement;
                let localHistory=elHistory?[...elHistory,actualEl]:[actualEl];
                let parentSelector=FindCSSSelector.findcssSelector(el,parentOfActualEl,localHistory);
                cssSelector=parentSelector.cssSelector;
                baseSpecifity=parentSelector.specifity;

                if (cssSelector!=null){

                    //recursive yapıda history'den faydalanan iç metod bu katmanda ya da daha
                    //üst katmanda bir elementi bulmuş olabilir (bu olumlu birşey)
                    //o zaman uzatmadan donmeye bakalım.
                    //not: localhistory'de actualel var en az 1 item olduğu kesin direkt
                    //oradan sondan başa tarayalım
                    let tmpResult=FindCSSSelector.cssSelect(cssSelector);
                    for(let i=localHistory.length-1;i>-1;i--){
                        if (localHistory[i]==tmpResult[0]){ //selectorun düzgün olduğuna alt metoddaki kontrollerden güveniyoruz.
                            found=true;
                            specifity=baseSpecifity;
                            result=tmpResult;
                            timeElapsed=result.timeElapsed;
                            actualEl=localHistory[i]; //kontrollerden geçebilmesi için actualEl değiştirilir.
                            break;
                        }
                    }

                    if (!found){
                        if (cssSelector && elHistory){ //bu gelinen noktadan historyden buraya kadar unique tag ya da class bulmaya çalış.
                            for(let i=0;i<elHistory.length;i++){
                                checkByCss(cssSelector+" ",elHistory[i],'Tarihçe Css Unique Check');
                                if (found){
                                    actualEl=elHistory[i]; //kontrollerden geçebilmesi için actualEl değiştirilir.
                                    break;
                                }
                            }
                        }

                        if (!found){

                            checkByCss(cssSelector?cssSelector+' > ':actualEl.parentElement.tagName+" > ",actualEl,'Alt Öğe Css Unique Check');
            
                            if (!found && result.length>1){ 

                                //NOT://aslında üstten çıkan class bazlı çoğul sonuçlar da var ama
                                //aynı öğenin ilk çocukları arasındaki sınıf farklarına güvenemeyiz.
                                //geçici sınıflar da olabilir. en sağlıklısı tag üzerinden gitmek bu aşamaya gelince

                                //NOT:bu kuralın mantıklı olması için bulunan öğelerin hepsi aynı
                                //parenta sahip olmalı o yüzden bu katmanda mutlaka selectorda > ilişkisi olmalı

                                //TODO: aslında hemen üstteki checkByCss de tagName üzerinden kontrol ediyor artık.
                                //ancak class lar ile içiçe olduğu orada kotarmak yanlış olur.
                                //belki performans için üssteki metodu tagName check etmeyecek bir direktif eklenebilir.

                                cssSelector=cssSelector?cssSelector+' > '+actualEl.tagName:actualEl.parentElement.tagName+' > '+actualEl.tagName;
                                specifity=baseSpecifity+1; //tag name
                                result=FindCSSSelector.cssSelect(cssSelector);
                                timeElapsed=result.timeElapsed;
                                bugPosition='alt öğe';
                                if (result.length>1){ //gene mi olmadı. o zaman mecbur öğe sırasını da ekleyeceğiz.
                                    
                                    //ÖNEMLİ NOT: burası asla düşmemek istediğimiz nokta.
                                    specifity+=1; //pseudo element
                                    for(let i=0;i<result.length;i++){
                                        if (result[i]==actualEl){
                                            if (i==0)
                                                cssSelector+=':first-of-type';
                                            else if (i==result.length-1)
                                                cssSelector+=':last-of-type';
                                            else
                                                cssSelector+=':nth-of-type('+(i+1)+')';

                                            result=FindCSSSelector.cssSelect(cssSelector);
                                            timeElapsed=result.timeElapsed;
                                            bugPosition='sira no';
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }else{
                    debugger;
                    cssSelector=actualEl.tagName;
                }
            }


        }
        
        if (!result){
            if (!cssSelector) //bunun olabileceği tek case bodycheck olmalı yok bug
                return null;
            else if (cssSelector=='BODY'||cssSelector=='HTML')
                return { cssSelector:"",specifity:0,calculationTimeElapsed:Date.now()-findTimeElapsed,cssSelectorTimeElapsed:0 };
            else
                FindCSSSelector.logBuggyUnmatchedSingleOrNoResult(bugPosition,actualEl,cssSelector,'(no result check bug)');
        }else if (result.length==0){
            FindCSSSelector.logBuggyUnmatchedSingleOrNoResult(bugPosition,actualEl,cssSelector);
        }else if (result.length==1 && result[0]!=actualEl){
            FindCSSSelector.logBuggyUnmatchedSingleOrNoResult(bugPosition,actualEl,cssSelector,result[0]);
        }else if (result.length>1){
            FindCSSSelector.logBuggyUnmatchedSingleOrNoResult(bugPosition,actualEl,cssSelector,'(no single item)');
        }else
            return { cssSelector:cssSelector,specifity:specifity,calculationTimeElapsed:Date.now()-findTimeElapsed,cssSelectorTimeElapsed:result.timeElapsed };
    },

    scanAllUserControls:function(){
		let timeElapsed=Date.now();
		FindCSSSelector.userElementsObject={};
        FindCSSSelector.userElementsDom=[...document.querySelectorAll(FindCSSSelector.userControlsCSSSelector)];
        
        //üsttekilerine ek olarak kod ile event handler eklenmiş nesleleri
        FindCSSSelector.userElementsJsAssigned=[...document.querySelectorAll("BODY *")].filter(el=>{
            if (FindCSSSelector.userElementsDom.indexOf(el)<0){
                let e=getEventListeners(el);
                return e.click || e.mousedown || e.dblclick || e.mouseup;
            }
        });

        console.log('dom içinden tespit edilen:'+FindCSSSelector.userElementsDom.length);
        console.log('event handler içinden tespit edilen (plugin tarafından çalışmaz):'+FindCSSSelector.userElementsJsAssigned.length);
        FindCSSSelector.userElements=FindCSSSelector.userElementsDom.concat(FindCSSSelector.userElementsJsAssigned);
        console.log('total tespit edilen:'+FindCSSSelector.userElements.length);

		FindCSSSelector.userElements.forEach(el=> { 
			let selector=FindCSSSelector.findcssSelector(FindCSSSelector.findParentWithId(el),el);
			FindCSSSelector.userElementsObject[selector.cssSelector]= { 
				el:el,
				specifity:selector.specifity,
				calculationTimeElapsed:selector.calculationTimeElapsed,
				cssSelectorTimeElapsed:selector.cssSelectorTimeElapsed
			};
		});
		FindCSSSelector.userElementsObject.timeElapsed=Date.now()-timeElapsed;
		FindCSSSelector.userElementsArray=Object.keys(FindCSSSelector.userElementsObject).filter(a=>a!='timeElapsed');
		FindCSSSelector.problematicUserElementsArray=FindCSSSelector.userElementsArray.filter(selector=>(FindCSSSelector.problematicDetectionRegex.test(selector))); //||userElementsObject[selector].specifity<100
		FindCSSSelector.problematicUserElementsObject={}; //consoldan kontrol edilebilir.
		FindCSSSelector.problematicUserElementsArray.forEach(selector=> FindCSSSelector.problematicUserElementsObject[selector]=FindCSSSelector.userElementsObject[selector]);

        console.log("Time elapsed:"+(Date.now()-timeElapsed));
		console.log("Bulunan Kullanıcı Bileşenleri");
		console.log(FindCSSSelector.userElementsObject);
    },

    logByElapsedTime:function (milliseconds){
        milliseconds=milliseconds||0;
        if (FindCSSSelector.userElementsArray){
            FindCSSSelector.userElementsArray.filter(a=>FindCSSSelector.userElementsObject[a].cssSelectorTimeElapsed>milliseconds).forEach(a=>console.log(FindCSSSelector.userElementsObject[a]));
        }	
    },

    colorIt:function(cssSelectorArray){
        let timeElapsed=Date.now();
        let colorClass="FindCSSSelector-showItem";
        [...document.querySelectorAll("."+colorClass)].forEach(el=>el.classList.remove(colorClass));
        cssSelectorArray=cssSelectorArray||FindCSSSelector.userElementsArray;
        if (cssSelectorArray){
            cssSelectorArray.forEach(selector=>{
                let el=document.querySelector(selector);
                if (!el)
                    console.log("Hata:",selector);
                el.classList.add(colorClass);
            });
        }	
        console.log("Time Elapsed:"+(Date.now()-timeElapsed));	
    },
    
    colorClear:function (){
        let timeElapsed=Date.now();
        let colorClass="FindCSSSelector-showItem";
        [...document.querySelectorAll("."+colorClass)].forEach(el=>el.classList.remove(colorClass));
        console.log("Time Elapsed:"+(Date.now()-timeElapsed));	
    }
    
}

