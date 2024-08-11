// ==UserScript==
// @name         amazon sample trans
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @updateURL    https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @downloadURL  https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @description  try to take over the world!
// @author       anemochore
// @match        https://read.amazon.com/sample/*
// @match        https://read.amazon.co.jp/sample/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

const API_KEY = GM_getValue('GOOGLE_API_KEY');

const output = document.createElement('textarea');
output.spellcheck = false;
output.style.top = '12%';
output.style.left = '65.75%';
output.style.width = '674px';
output.style.height = '85.5%';
output.style.position = 'absolute';
output.style.fontSize = '2em';
output.style.lineHeight = '1.5em';
output.style.backgroundColor = 'lightgray';
output.style.overflow = 'scroll';
output.style.zIndex = '9999';
document.body.append(output);
output.value = '실행 중...';

if(!API_KEY || API_KEY == 'enter your key here!!!') {
  GM_setValue('GOOGLE_API_KEY', 'enter your key here!!!');
  output.value = '탬퍼멍키 저장소에 본인 구글 API 키를 써야 합니다.';
  return;
}

let SINGLE_PAGE_FLAG = false;
if(location.host == 'read.amazon.co.jp') SINGLE_PAGE_FLAG = true;

const observer = new MutationObserver(onLoad);
let texts, translations;

if(!SINGLE_PAGE_FLAG) {
  //amazon.com
  await elementReady_('div[data-page]', document, {returnAll: true, checkIfAllChildrenAreAdded: true});
  const imgs = await elementReady_('div[data-page]>img', document, {returnAll: true, checkIfAllChildrenAreAdded: true});

  texts = [], translations = [];
  output.value = '';
  for(const img of imgs) {
    const i = img.parentElement.getAttribute('data-page');

    texts[i] = await ocr(img.src) || ' ';
    if(texts[i]) translations[i] = decodeHtml(await translate(texts[i]));
    output.value = output.value + translations[i] + '\n----\n';
  }
}
else {
  texts = {}, translations = {};
  
  await onLoad();  //force first run
  observer.observe(document, {childList: true, subtree: true});
}

async function onLoad() {
  const div = await elementReady_('div.kg-full-page-img');
  const img = await elementReady_('img', div);
  const b64 = convertImageToBase64(img).replace('data:image/png;base64,', '');
  const key = img.src.split('/').pop();
  //console.log('key', key);

  if(!texts[key]) {
    texts[key] = await ocr(b64) || ' ';
    if(texts[key]) translations[key] = decodeHtml(await translate(texts[key]));
  }
  output.value = translations[key] || ' ';
}
  

function convertImageToBase64(image) {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  // Draw the image onto the canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  // Convert the canvas to a base64-encoded data URL
  const dataUrl = canvas.toDataURL(); // By default, this is PNG format
  return dataUrl;
}

function decodeHtml(html) {
  //https://stackoverflow.com/a/7394787/6153990
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

async function ocr(imgUrlOrB64) {
  //구글 ocr(월 이미지 1000개 무료)

  let reqImage;
  if(imgUrlOrB64.startsWith('http')) reqImage = {source: {imageUri: imgUrlOrB64}};
  else reqImage = {content: imgUrlOrB64};
  
  let res, data, text;
  try {
    res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          features: [{type: "TEXT_DETECTION"}],
          image: reqImage,
        }],
      }),
    });
    data = await res.json();
    text = data.responses?.pop().fullTextAnnotation.text?.replaceAll(/Copyrighted Material/g, '');
  }
  catch(e) {
    console.log('google ocr failed', e);
  }
  return text;
}

async function translate(text, targetLanguage = 'ko') {
  //구글 번역(월 50만 자 무료)

  let res, data, translation;
  try {
    res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}&q=${encodeURIComponent(text)}&target=${targetLanguage}`);
    data = await res.json();
    translation = data.data?.translations.pop().translatedText;
  }
  catch(e) {
    console.log('google trans failed', e);
  }
  return translation;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function elementReady_(selector, baseEl = document.documentElement, options = {}) {
  return new Promise((resolve, reject) => {
    let els = [...baseEl.querySelectorAll(selector)];
    if(els.length > 0 && !options.waitFirst) {
      if(options.returnAll) resolve(els);
      else resolve(els[els.length-1]);
    }

    this.prevElNumber = els.length;
    console.debug('this.prevElNumber, els.length', this.prevElNumber, els.length);

    new MutationObserver(async (mutationRecords, observer) => {
      let els = [...baseEl.querySelectorAll(selector)];
      if(els.length > 0) {
        if(!options.checkIfAllChildrenAreAdded) {
          console.debug('resolved for checkIfAllChildrenAreAdded false', els);
          observer.disconnect();
          if(options.returnAll) resolve(els);
          else resolve(els[els.length-1]);
        }
        else if(els.length > this.prevElNumber) {
          this.prevElNumber = els.length;
          await sleep(1000);  //dirty hack
          if([...baseEl.querySelectorAll(selector)].length == this.prevElNumber) {
            console.debug('resolved for checkIfAllChildrenAreAdded true', els);
            observer.disconnect();
            if(options.returnAll) resolve(els);
            else resolve(els[els.length-1]);
          }
        }
      }
    })
    .observe(baseEl, {
      childList: true,
      subtree: true
    });
  });
}
