// ==UserScript==
// @name         amazon sample trans
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @updateURL    https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @downloadURL  https://raw.githubusercontent.com/anemochore/amazon-sample-trans/main/app.js
// @description  try to take over the world!
// @author       anemochore
// @match        https://read.amazon.com/sample/*
// @match        https://read.amazon.co.jp/sample/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      apigw.ntruss.com
// @connect      googleapis.com
// @connect      deepl.com
// ==/UserScript==

const ocrs = {}, transFuncs = {};
ocrs.naver = async imgUrlOrB64 => {
  //네이버 ocr(월 100건(?) 무료)

  const reqImage = {name: 'whatever'};
  if(imgUrlOrB64.startsWith('http')) {
    reqImage.format = imgUrlOrB64.split('?').shift().split('.').pop();
    reqImage.url= imgUrlOrB64;
  }
  else {
    reqImage.format = 'png';
    reqImage.data = imgUrlOrB64;
  };

  const timeStamp = Date.now();
  let res, data, lines;
  //try {
    res = await fetchCors(ocrUrl, {
    //res = await fetch(ocrUrl, {
      method: 'POST',
      headers: {
        'X-OCR-SECRET': ocrKey,
        'Content-Type': 'application/json',
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
      //console.log('data', data);
      const fields = data.images[0].fields;

      //get lines
      lines = [];
      let lineBuffer = makeLine(fields[0]);
      if(fields[0]?.lineBreak) {
        lines.push(lineBuffer);
        lineBuffer = {};
      }
      for(let i = 1; i < fields.length; i++) {  //starts from 1
        const field = fields[i];
        const line = makeLine(field);

        if(field?.lineBreak) {
          lines.push(mergeLines(lineBuffer, line));
          lineBuffer = {};
        }
        else {
          lineBuffer = mergeLines(lineBuffer, line);
        }
      }
      if(lineBuffer.x1) lines.push(lineBuffer);
    }
  /*
  }
  catch(e) {
    console.log('naver ocr failed', e);
  }
  */

  console.log('lines:', lines);
  return lines;


  function mergeLines(line1, line2) {
    if(!line1.x1) return line2;
    if(!line2.x1) return line1;

    const line = {};
    [line.x1, line.y1] = [line1.x1, line1.y1];
    [line.x2, line.y2] = [line2.x2, line2.y2];
    line.text = line1.text + ' ' + line2.text;  //maybe one space is not enough. but forget it for now.
    line.fontSize = Math.min((line1.fontSize, line2.fontSize));  //approx~
    return line;
  }

  function makeLine(field) {
    const line = {};
    if(field?.boundingPoly) {
      [line.x1, line.y1] = [field.boundingPoly.vertices[0].x, field.boundingPoly.vertices[0].y];
      [line.x2, line.y2] = [field.boundingPoly.vertices[2].x, field.boundingPoly.vertices[2].y];
      line.text = field.inferText;

      //get approx. font size
      line.fontSize = (line.x2 - line.x1) / line.text.length * 0.9;
    }

    return line;
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
    text = data.responses?.pop().fullTextAnnotation.text;
    console.log('text:', text);
  }
  catch(e) {
    console.log('google ocr failed', e);
  }

  return text;
};
transFuncs.google = async (text, target = navigator.language.slice(0, 2)) => {
  //구글 번역(월 50만 자 무료)

  let res, data, translation;
  try {
    res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${ocrKey}&q=${encodeURIComponent(text)}&target=${target}`);
    data = await res.json();
    translation = data.data?.translations.pop().translatedText;
    console.log('translation:', translation.replaceAll(/<br\/>/g, '\n'));
  }
  catch(e) {
    console.log('google trans failed', e);
  }

  return translation;
};
transFuncs.deepl = async (text, target = navigator.language.slice(0, 2)) => {
  //딥엘 무료 번역(월 50만 자 무료)

  let res, data, translation;
  try {
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
    translation = data?.translations.pop().text;
    console.log('translation:', translation.replaceAll(/<br\/>/g, '\n'));
  }
  catch(e) {
    console.log('deepl trans failed', e);
  }

  return translation;
};


const buttonAndStatus = document.createElement('button');
let root, SINGLE_PAGE_FLAG, texts, translations, imgs = {};

let ocrKey, ocrFunc, ocrUrl, transKey, transFunc;
await init();
if(!ocrFunc || !transFunc) {
  GM_setValue('사용법', '깃허브 저장소의 리드미를 참고해서 탬퍼멍키 저장소에 본인 크리덴셜을 써둡시다.');
  buttonAndStatus.innerText = '깃허브 저장소의 리드미를 참고해서 탬퍼멍키 저장소에 본인 크리덴셜을 써둡시다.';
  return;
}


let observer, prevImgsLength;  //, prevKey;
observer = new MutationObserver(onLoad);
await onLoad();  //force first run


async function init() {
  //buttonAndStatus
  buttonAndStatus.style.top = '1.5%';
  buttonAndStatus.style.left = '65.75%';
  buttonAndStatus.style.position = 'absolute';
  buttonAndStatus.style.zIndex = '9999';
  buttonAndStatus.style.fontSize = '2rem';
  buttonAndStatus.style.backgroundColor = 'lawngreen';
  document.body.append(buttonAndStatus);
  buttonAndStatus.innerText = '실행 중...';
  buttonAndStatus.disabled = true;
  buttonAndStatus.onclick = e => {
    observer.disconnect();
    console.log('e', e);
    let button = e.target, show = 'block';
    if(button.innerText == 'hide') {
      show = 'none';
      button.innerText = 'show';
    }
    else {
      show = 'block';
      button.innerText = 'hide';
    }
    [...document.querySelectorAll('.fy-text')].forEach(el => {
      console.log('el', el);
      el.style.display = show;
    });
    observer.observe(document, {childList: true, subtree: true});
  };

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
        buttonAndStatus.innerText = '탬퍼멍키 저장소에 네이버 OCR 게이트웨이 URL(NAVER_OCR_URL)도 써야 합니다.';
        ocrFunc = null;
        return;
      }
    }
    else {
      buttonAndStatus.innerText = '탬퍼멍키 저장소에 본인 구글 OCR API 키(GOOGLE_OCR_API_KEY)를 쓰든가 네이버 OCR 시크릿 & OCR 게이트웨이 URL(NAVER_OCR_URL)을 써야 합니다.';
      return;
    }
  }

  //번역: google, deepl 순서
  transKey = GM_getValue('GOOGLE_TRANS_API_KEY') || GM_getValue('GOOGLE_API_KEY');
  if(transKey) transFunc = transFuncs.google;
  else {
    transKey = GM_getValue('DEEPL_API_KEY');
    if(transKey) transFunc = transFuncs.deepl;
    else {
      buttonAndStatus.innerText = '탬퍼멍키 저장소에 본인 구글 번역 API 키(GOOGLE_TRANS_API_KEY)를 쓰든가 딥엘 API 키(DEEPL_API_KEY)를 써야 합니다.';
      return;
    }
  }

  //entry
  root = await elementReady_('div#kr-renderer');
  SINGLE_PAGE_FLAG = (await elementReady_('div.litb-reading-area', document, {resolveWhenClassChanges: true})).classList.contains('paginated');

  if(SINGLE_PAGE_FLAG) {
    texts = {}, translations = {};
  }
  else {
    texts = [], translations = [];
  }
}

async function onLoad() {
  observer.disconnect();
  buttonAndStatus.disabled = true;

  let keys;
  if(!SINGLE_PAGE_FLAG) {
    //div 먼저 순차적으로 DOM에 추가되고, 그 안의 img들은 더 나중에 로드된다.
    await elementReady_('div[data-page]', document, {returnAll: true, checkIfAllChildrenAreAdded: true});
    const curImgs = await elementReady_('div[data-page]>img', document, {returnAll: true});
    console.log('prev imgs length, imgs length', prevImgsLength, curImgs.length);

    if(!prevImgsLength || curImgs.length > prevImgsLength) {
      keys = curImgs.map(el => el.parentElement.getAttribute('data-page'));
      for(const [i, key] of keys.entries()) {
        if(!imgs[key]) {
          const img = curImgs[i];
          imgs[key] = {};
          imgs[key].imgUrlOrB64 = img.src;
          imgs[key].imgRoot = img.parentNode;
          imgs[key].ratio = img.width / img.naturalWidth;
        }
      }
      prevImgsLength = curImgs.length;
    }
  }
  else {
    root = await elementReady_('div#kr-renderer');  //need to refresh root when single page
    let img = await elementReady_('img', root, {waitFirst: true, checkIfAllChildrenAreAdded: true});
    let key = img.src.split('/').pop();

    keys = [key];
    if(!imgs[key]) {
      imgs[key] = {};
      imgs[key].imgUrlOrB64 = img.src;
      if(img.src.startsWith('blob')) imgs[key].imgUrlOrB64 = convertImageToBase64(img).replace('data:image/png;base64,', '');
      imgs[key].imgRoot = img.parentNode;
      imgs[key].ratio = img.width / img.naturalWidth;
      //prevKey = key;
    }

    buttonAndStatus.innerText = '실행 중...';
  }

  for(const key of keys) {
    //console.debug('current key, value, !texts[key]:', key.slice(0,99), imgs[key].imgUrlOrB64, !texts[key]);
    let lines;
    if(!texts[key]) {
      lines = await ocrFunc(imgs[key].imgUrlOrB64);
      addLines(imgs[key], lines);
      texts[key] = (lines || []).filter(el => el.text != 'Copyrighted Material').map(el => el.text).join('<br/>');
    }

    if(texts[key] && !translations[key]) {
      translations[key] = decodeHtml((await transFunc(texts[key]) || '').replaceAll(/<br\/>/g, '\n'));
      //translations[key] = texts[key];
    }

    if(translations[key]) updateLines(imgs[key], translations[key].split('\n'));
    //if(translations[key]) updateLines(imgs[key], translations[key].split('<br/>'));

    console.log(`page ${key} processed. translation length: ${translations[key]?.length}`);
  }

  buttonAndStatus.disabled = false;
  buttonAndStatus.innerText = 'hide';
  observer.observe(document, {childList: true, subtree: true});
}

function addLines(img, lines) {
  img.linesEl = [];
  for(const line of lines) {
    const txt = document.createElement("textarea");
    txt.className = 'fy-text';

    //todo: let's do this by css
    txt.spellcheck = false;
    txt.style.padding = '0';
    txt.style.border = '0';
    txt.style.position = 'absolute';
    txt.style.resize = 'none';
    txt.style.overflow = 'hidden';
    txt.style.opacity = '0.9';
    
    txt.value = line.text;
    txt.style.top = (line.y1 * img.ratio) + 'px';
    txt.style.left = (line.x1 * img.ratio) + 'px';
    txt.style.width = ((line.x2 - line.x1) * img.ratio) + 'px';
    txt.style.height = Math.max(((line.y2 - line.y1) * img.ratio), 18) + 'px';
    txt.style.fontSize = Math.max((line.fontSize * 0.9 * img.ratio), 11) + 'px';

    img.imgRoot.appendChild(txt);
    img.linesEl.push(txt);
  }
}

function updateLines(img, translationLines) {
  for(const [i, txt] of img.linesEl.entries()) {
    if(translationLines[i]) txt.value = translationLines[i];
  }
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
    const els = [...baseEl.querySelectorAll(selector)];
    if(els.length > 0 && !options.waitFirst && !options.resolveWhenClassChanges && !options.checkIfAllChildrenAreAdded) {
      console.debug('resolved immediately', els);
      if(options.returnAll) resolve(els);
      else resolve(els[els.length-1]);
    }

    this.prevElNumber = els.length;
    this.prevClassName = els[0]?.className;
    console.debug(`for '${selector}' class and length: '${this.prevClassName}', ${this.prevElNumber}`);

    new MutationObserver(async (mutationRecords, observer) => {
      const els = [...baseEl.querySelectorAll(selector)];

      if(els.length > 0) {
        if(!options.checkIfAllChildrenAreAdded && !options.resolveWhenClassChanges) {
          console.debug('resolved for checkIfAllChildrenAreAdded false & resolveWhenClassChanges false', els);
          observer.disconnect();
          if(options.returnAll) resolve(els);
          else resolve(els[els.length-1]);
        }
        else if(options.checkIfAllChildrenAreAdded && els.length >= this.prevElNumber) {
          this.prevElNumber = els.length;
          await sleep(1000);  //dirty hack
          if([...baseEl.querySelectorAll(selector)].length == this.prevElNumber) {
            console.debug('resolved for checkIfAllChildrenAreAdded true & resolveWhenClassChanges false', els);
            observer.disconnect();
            if(options.returnAll) resolve(els);
            else resolve(els[els.length-1]);
          }
        }
        else if(options.resolveWhenClassChanges && els[0].className != this.prevClassName) {
          console.debug('resolved for resolveWhenClassChanges true', els[0]);
          observer.disconnect();
          if(options.returnAll) resolve(els);
          else resolve(els[els.length-1]);
        }
      }
    })
    .observe(baseEl, {
      childList: true,
      subtree: true
    });
  });
}
