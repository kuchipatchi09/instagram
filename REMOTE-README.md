# Quietgram Remote — 독립 웹앱 실험 버전

> **상태:** 코드는 작성했지만 실제 Instagram 로그인·DM·스토리 동작은 아직 검증되지 않았습니다. 사이트 배포와 서버 운영이 추가로 필요합니다.

## 목표

아이패드/아이폰 Safari에서 별도 확장 앱 없이 **Quietgram 웹사이트 안에 실제 Instagram 웹페이지를 표시**하고 조작하는 개인용 원격 브라우저 프로젝트입니다.

- 원격 Chromium(Playwright)을 서버에서 실행
- 브라우저 화면을 WebSocket 이미지 스트림으로 Quietgram 웹 UI에 표시
- 화면 터치와 입력을 원격 Instagram 페이지에 전달
- 스토리/DM 버튼으로 공식 Instagram Web 홈 또는 메시지함으로 이동
- 페이지의 릴스/게시물/탐색 메뉴를 최선의 방식으로 숨기거나 이동 차단
- 로그인 세션, 쿠키, 스크린샷을 **파일로 저장하지 않음**; 20분 유휴 후 브라우저 컨텍스트 제거
- 별도 Quietgram 서버 접근 코드 필요

## 중요한 제한·보안

1. **일반 Instagram API로 구현한 클라이언트가 아닙니다.** 공개된 개인 계정용 스토리/DM API가 없기 때문에 원격 브라우저를 통한 화면 전달을 시도합니다.
2. **서버 운영자는 로그인 입력·세션에 기술적으로 접근 가능합니다.** 이 코드는 입력을 로그로 남기지 않지만, 서버 제공자나 소스 코드를 변경한 관리자를 절대적으로 신뢰할 수는 없습니다. 본인 소유의 보호된 서버 외에는 로그인하지 마세요.
3. Instagram은 자동화 및 무단 접근을 제한합니다. 원격 브라우저 로그인이 막히거나 계정이 제한될 수 있습니다. 이러한 보안 제한을 우회하거나 자동으로 CAPTCHA를 해결하지 않습니다.
4. 이 구현은 메시지와 스토리를 API로 다운로드하거나 검색하는 기능이 없습니다. 실제 Instagram 웹이 해당 계정에 스토리를 제공하는 경우에만 화면이 표시됩니다.
5. 동영상 스트리밍은 JPEG 화면 전송으로 음성이 포함되지 않고 프레임레이트가 낮을 수 있습니다. 문자 입력은 별도 원격 입력칸을 이용합니다.
6. **GitHub Pages만으로 동작하지 않습니다.** GitHub Pages는 서버에서 Chromium을 실행할 수 없습니다.

## Mac 없이 서버 배포 (Render)

1. 이 저장소의 [Render 배포 버튼](https://render.com/deploy?repo=https://github.com/kuchipatchi09/instagram)을 아이패드 Safari에서 열고 Render 계정에 로그인합니다.
2. `render.yaml` Blueprint에서 `quietgram-remote` 서비스를 확인합니다. 이 구성은 Playwright Chromium의 메모리 사용량을 고려해 **2GB 유료 인스턴스(`1c-2g`, 월 약 미화 $25)**를 선택합니다. 결제가 필요할 수 있으므로 승인 전 요금을 확인하세요.
3. `APP_ACCESS_CODE` 환경 변수에 **16자 이상의 충분히 강력하고 새로운 비밀 코드**를 설정합니다. **Instagram 비밀번호를 입력하지 마세요.** 이 코드를 GitHub 파일로 업로드해서도 안 됩니다.
4. 서비스를 배포하면 Render에서 고유한 `https://....onrender.com` 웹주소를 제공합니다.
5. 주소 접속 → Quietgram **접근 코드** 입력 → 원격 Instagram 웹 화면에서 직접 Instagram 로그인을 진행합니다.
6. 하단 **스토리 / DM** 탭을 눌러 실제 Instagram의 해당 화면으로 이동합니다. 테스트가 끝나면 **원격 세션 종료**를 눌러 브라우저를 닫습니다.

`render.yaml`에 실제 서비스 요금이 발생할 수 있으니, 배포 실행은 반드시 본인이 직접 승인해야 합니다.

## 로컬 서버 개발 (개인 PC가 있을 경우)

```bash
export APP_ACCESS_CODE='choose-a-long-private-code'
npm install
npx playwright install chromium
npm start
```

`http://localhost:3000`에서 실행합니다. 인터넷에 직접 노출하는 경우 HTTPS 프록시를 반드시 사용하세요. 외부 공개용 다중 사용자 서비스로 제공하도록 만들어지지 않았습니다.

## 구조

```text
remote/
  server.js           Express + WebSocket + Playwright 서버
  public/
    unlock.html       Quietgram 접근 코드 화면 (Instagram 비밀번호 아님)
    app.html          실제 원격 화면과 스토리/DM 전환 UI
Dockerfile            Playwright 브라우저 포함 실행 이미지
render.yaml           Render 배포 설정 (접근 코드 별도 지정)
package.json          Node.js 실행·검증
```

## 동작 검증 상태

- JavaScript 문법 및 기존 URL 차단 규칙 검증: 완료
- Render 서비스 빌드와 배포: **미실행**
- 원격 Instagram 로그인, CAPTCHA, 계정 승인: **미검증**
- 실제 친구 스토리 및 개인 DM: **미검증**
- iPad Safari의 키보드·터치 동작: **미검증**

Quietgram은 Meta 또는 Instagram과 제휴되지 않은 비공식 개인 프로젝트입니다.
