# amazon-sample-trans
amazon sample auto ocr &amp; trans (via google api) tampermonkey script

## 문제의식 & 기능
1. 이미지로 뜨는 아마존(미국 및 일본) 미리보기에도 자동 번역을 적용하고 싶다.
2. 크롬 브라우저의 구글 렌즈를 실행해도 번역은 적용할 수가 없다.
3. 미리보기는 `iframe`으로 뜨므로 콘솔창에서 그냥 자바스크립트를 실행해서는 이미지에 접근할 수가 없다.
4. 그래서 탬퍼멍키의 `@match`를 `iframe` 주소로 지정해서 자동으로 실행되게 만들 수밖에 없었다.
5. 이미지에 대해서는 Cloud Vision API로 OCR을 돌리고, 그 텍스트에 대해 Cloud Translation API로 번역을 실행하게 했다.
6. 이미지들이 레이지 로딩되므로 다 뜰 때까지 기다려야 해서 예전에 개조한 `elementReady()`를 썼다.

## 사용법
1. 구글 클라우드 콘솔에 프로젝트를 만들고 Cloud Vision API와 Cloud Translation API를 사용 설정하고 API 키를 적어둔다.
2. 탬퍼멍키에 app.js를 추가하고 탬퍼멍키 설정을 '상급자'로 바꾼 다음 아마존 미리보기를 한 번 띄우면 탬퍼멍키 저장소에 API 키를 적으라고 나올 거다.
3. 탬퍼멍키 저장소에 가서 `GOOGLE_API_KEY`에 자신의 API 키를 적는다.
4. 다시 아마존 페이지에 접속해 새로고침하고 미리보기를 보면 옆에 번역이 나옴.
