# amazon-sample-trans
amazon sample auto ocr &amp; trans (via google, etc api) tampermonkey script

## 문제의식 & 기능
1. 이미지로 뜨는 아마존(미국 및 일본) 미리보기에도 자동 번역을 적용하고 싶다.
2. 크롬 브라우저의 구글 렌즈를 실행해도 번역은 적용할 수가 없다.
3. 미리보기는 `iframe`으로 뜨므로 콘솔창에서 그냥 자바스크립트를 실행해서는 이미지에 접근할 수가 없다.
4. 그래서 탬퍼멍키의 `@match`를 `iframe` 주소로 지정해서 자동으로 실행되게 만들 수밖에 없었다.
5. 이미지에 대해서는 Cloud Vision API로 OCR을 돌리고, 그 텍스트에 대해 Cloud Translation API로 번역을 실행하게 했다. -> 구글이 비싸서 네이버 OCR과 딥엘 번역도 추가했다(네이버 번역은 무료가 없어서 제외).
6. 이미지들이 레이지 로딩되므로 다 뜰 때까지 기다려야 해서 예전에 개조한 `elementReady()`를 썼다.

## 사용법
1. 사용할 OCR 및 번역 API를 정하자. 가령 구글을 사용할 거라면 구글 클라우드 콘솔에 프로젝트를 만들고 Cloud Vision API와 Cloud Translation API를 사용 설정하고 API 키를 적어둔다. 네이버, 딥엘도 마찬가지.
2. 탬퍼멍키에 app.js를 추가하고 탬퍼멍키 설정을 '상급자'로 바꾼 다음 아마존 미리보기를 한 번 띄우면 탬퍼멍키 저장소에 API 키를 적으라고 나올 거다.
3. 사용할 OCR 및 번역 API의 크리덴셜을 탬퍼멍키 저장소에 적는다.
    1. OCR을 [구글](https://cloud.google.com/vision/docs/ocr)로 사용하려면 `"GOOGLE_OCR_API_KEY"`에 본인 API 키를 적는다. 
    2. OCR을 [네이버](https://api.ncloud-docs.com/docs/ai-application-service-ocr)로 사용하려면 `"NAVER_OCR_SECRET"`에 클로바 시크릿을 적고 `"NAVER_OCR_URL"`에 APIGW Invoke URL을 적는다(개발자는 'API Gateway 자동 연동'을 켜고 테스트했다).
    3. 번역을 [구글](https://cloud.google.com/translate/docs)로 사용하려면 `"GOOGLE_TRANS_API_KEY"`에 본인 API 키를 적는다(OCR과 동일한 프로젝트라면 API 키도 같다).
    4. 번역을 [딥엘](https://developers.deepl.com/docs)로 사용하려면 `"DEEPL_API_KEY"`에 본인 API 키를 적는다(무료 사용자용으로 하드코딩).
4. 다시 아마존 페이지에 접속해 새로고침하고 미리보기를 눌러보면 옆에 번역이 뜸.
