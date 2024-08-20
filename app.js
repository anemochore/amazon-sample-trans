// ==UserScript==
// @name         amazon sample trans
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @updateURL    https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @downloadURL  https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @description  try to take over the world!
// @author       anemochore
// @match        https://read.amazon.com/sample/*
// @match        https://read.amazon.co.jp/sample/*
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      apigw.ntruss.com
// @connect      googleapis.com
// @connect      deepl.com
// ==/UserScript==

const ocrs = {}, translates = {};
ocrs.naver = async function(imgUrlOrB64) {
  //네이버 ocr(월 100건(?) 무료)

  const reqImage = {name: 'whatever'};
  if(imgUrlOrB64.startsWith('http')) {
    reqImage.format = imgUrlOrB64.split('?').shift().split('.').pop();
    reqImage.url= imgUrlOrB64;
  }
  else {
    reqImage.format = 'png',
    reqImage.data = imgUrlOrB64;
  };

  let res, data, text;
  try {
    const timeStamp = Date.now();
    
    const clovaEndpoint = ocrUrl;
    res = await fetchCors(clovaEndpoint, {
    //res = await fetch(clovaEndpoint, {
      method: 'POST',
      headers: {
        'X-OCR-SECRET': ocrKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'V2',
        requestId: 'id_' + timeStamp,
        timestamp: timeStamp,
        lang: 'ja',  //english is supported by default
        images: [reqImage],
        //enableTableDetection: true,
      }),
    });
    //data = await res.json();
    data = res.response;
    if(data.images[0]?.inferResult == 'SUCCESS') {
      const imageFields = data.images[0].fields;
      const inferTexts = imageFields.map(el => el.inferText),
            lineBreaks = imageFields.map(el => el.lineBreak ? '\n' : ' ');
      text = zip(inferTexts, lineBreaks).map(el => el.join('')).join('');
    }
    console.log('text:', text);
  }
  catch(e) {
    console.log('naver ocr failed', e);
  }

  return text;

  function zip(...rows) {
    //https://stackoverflow.com/a/10284006/6153990
    return [...rows[0]].map((_,c) => rows.map(row => row[c]));
  }
};
ocrs.google = async imgUrlOrB64 => {
  //구글 ocr(월 이미지 1000개 무료)

  let reqImage;
  if(imgUrlOrB64.startsWith('http')) reqImage = {source: {imageUri: imgUrlOrB64}};
  else reqImage = {content: imgUrlOrB64};
  
  let res, data, text;
  try {
    res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${ocrKey}`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          features: [{type: "TEXT_DETECTION"}],
          image: reqImage,
        }],
      }),
    });
    data = await res.json();
    text = data.responses?.pop().fullTextAnnotation.text?.replaceAll(/Copyrighted Material/g, '').replaceAll(/\n/gm, '<br/>');
    console.log('text:', text);
  }
  catch(e) {
    console.log('google ocr failed', e);
  }

  return text;
};
translates.google = async (text, target = navigator.language.slice(0, 2)) => {
  //구글 번역(월 50만 자 무료)

  let res, data, translation;
  try {
    res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${ocrKey}&q=${encodeURIComponent(text)}&target=${target}`);
    data = await res.json();
    translation = data.data?.translations.pop().translatedText.replaceAll(/<br\/>/g, '\n');
    console.log('translation:', translation);
  }
  catch(e) {
    console.log('google trans failed', e);
  }

  return translation;
};
translates.deepl = async (text, target = navigator.language.slice(0, 2)) => {
  //딥엘 무료 번역(월 50만 자 무료)

  let res, data, translation;
  //try {
    res = await fetchCors(`https://api-free.deepl.com/v2/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${transKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: target,
      }),
    });
    data = res.response;
    translation = data?.translations.pop().text.replaceAll(/<br\/>/g, '\n');
    console.log('translation:', translation);
  /*
  }
  catch(e) {
    console.log('deepl trans failed', e);
  }
  */

  return translation;
};


const output = document.createElement('textarea');
let root, SINGLE_PAGE_FLAG, texts, translations;
let ocrKey, ocrFunc, ocrUrl, transKey, transFunc;
await init();
if(!ocrFunc || !transFunc) return;

let observer, imgsLength;
observer = new MutationObserver(onLoad);
await onLoad();  //force first run


async function init() {
  //output
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

  //ocr: google, naver 순서
  ocrKey = GM_getValue('GOOGLE_OCR_API_KEY');
  if(!ocrKey && !GM_getValue('DEEPL_API_KEY') && GM_getValue('GOOGLE_API_KEY')) ocrKey = GM_getValue('GOOGLE_API_KEY');

  if(ocrKey) ocrFunc = ocrs.google;
  else {
    ocrKey = GM_getValue('NAVER_OCR_SECRET');
    if(ocrKey) {
      ocrFunc = ocrs.naver;
      ocrUrl = GM_getValue('NAVER_OCR_URL');
      if(!ocrUrl) {
        output.value = '탬퍼멍키 저장소에 네이버 OCR 게이트웨이 URL(NAVER_OCR_URL)도 써야 합니다.';
        ocrFunc = null;
        return;
      }
    }
    else {
      output.value = '탬퍼멍키 저장소에 본인 구글 OCR API 키(GOOGLE_OCR_API_KEY)를 쓰든가 네이버 OCR 시크릿 & OCR 게이트웨이 URL(NAVER_OCR_URL)을 써야 합니다.';
      return;
    }
  }

  //번역: google, deepl 순서
  transKey = GM_getValue('GOOGLE_TRANS_API_KEY') || GM_getValue('GOOGLE_API_KEY');
  if(transKey) transFunc = translates.google;
  else {
    transKey = GM_getValue('DEEPL_API_KEY');
    if(transKey) transFunc = translates.deepl;
    else {
      output.value = '탬퍼멍키 저장소에 본인 구글 번역 API 키(GOOGLE_TRANS_API_KEY)를 쓰든가 딥엘 API 키(DEEPL_API_KEY)를 써야 합니다.';
      return;
    }
  }

  //entry
  root = await elementReady_('div#kr-renderer');
  SINGLE_PAGE_FLAG = root.querySelector('div[data-page]') ? false : true;

  if(SINGLE_PAGE_FLAG) {
    texts = {}, translations = {};
  }
  else {
    texts = [], translations = [];
  }
}

async function onLoad() {
  observer.disconnect();

  const keys = [], imgUrlOrB64s = {};
  if(!SINGLE_PAGE_FLAG) {
    await elementReady_('div[data-page]', document, {checkIfAllChildrenAreAdded: true});
    const imgs = await elementReady_('div[data-page]>img', document, {returnAll: true, checkIfAllChildrenAreAdded: true});
    console.log('prev imgs length, imgs length', imgsLength, imgs.length);

    if(!imgsLength || imgs.length > imgsLength) {
      keys = imgs.map(el => el.parentElement.getAttribute('data-page'));
      keys.forEach((key, i) => {
        if(texts[key]) keys[i] = null;
        else imgUrlOrB64s[key] = imgs[i].src;
      });
      imgsLength = imgs.length;
    }
  }
  else {
    root = await elementReady_('div#kr-renderer');  //need to refresh root when single page
    let img = await elementReady_('img', root, {checkIfAllChildrenAreAdded: true});
    let key = img.src.split('/').pop();

    keys[0] = key;
    imgUrlOrB64s[key] = convertImageToBase64(img).replace('data:image/png;base64,', '');
  }

  let prevOutput = output.value;
  for(const key of keys) {
    if(!texts[key]) {
      output.value = '실행 중...';
      texts[key] = await ocrFunc(imgUrlOrB64s[key]) || ' ';
    }
    if(texts[key] && !translations[key]) translations[key] = decodeHtml(await transFunc(texts[key]));
    else output.value = prevOutput;

    if(!SINGLE_PAGE_FLAG) output.value = translations.filter(el => el).join('\n----\n');
    else                  output.value = translations[key] || ' ';

    console.log(`page ${key} processed. translation length: ${translations[key]?.length}`);
  }

  observer.observe(document, {childList: true, subtree: true});
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

async function fetchCors(url, payload) {
  if(payload.body && !payload.data) {
    //rename .body to .data
    payload.data = payload.body;
    delete payload.body;
  }

  //console.debug('payload:', payload);
  return new Promise((resolve, reject) => {
    payload.url = url;
    payload.responseType = 'json';
    payload.onload = res => {
      //console.debug('res:', res);
      resolve(res);
    };

    GM_xmlhttpRequest(payload);
  });
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
    console.debug('this.prevElNumber, els.length:', selector, this.prevElNumber, els.length);

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
