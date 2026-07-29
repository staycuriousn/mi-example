# Cloudflare Tunnel로 외부 공유하기

로컬 PC에서 실행 중인 MI 플랫폼(localhost:8000)을 다른 PC에서 접속할 수 있게 하는 가이드.
터널은 **서버가 돌아가는 PC에서** 실행해야 하며, PC 절전/종료 시 접속이 끊긴다.

> ⚠️ 현재 앱에는 로그인이 없다. 터널 주소를 아는 사람은 누구나 조회·엑셀 업로드가 가능하므로
> 주소를 필요한 사람에게만 공유하고, 시연이 끝나면 터널을 종료할 것.
> 장기 운영 시에는 Cloudflare Access(이메일 인증) 적용 또는 앱 자체 로그인 추가를 권장.

## 0. 사전 준비 (공통)

백엔드가 떠 있어야 한다:

```bash
# 저장소 루트에서
uvicorn backend.main:app --port 8000
# http://localhost:8000 이 열리는지 먼저 확인
```

cloudflared 설치:

| OS | 설치 명령 |
|---|---|
| Windows | `winget install --id Cloudflare.cloudflared` (또는 [공식 다운로드](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)) |
| macOS | `brew install cloudflared` |
| Linux | 패키지 저장소 또는 공식 .deb/.rpm |

설치 확인: `cloudflared --version`

---

## 방법 A — 빠른 터널 (계정·도메인 불필요, 1분)

시연·단기 공유용. 실행할 때마다 주소가 바뀐다.

```bash
cloudflared tunnel --url http://localhost:8000
```

출력에 나오는 `https://무작위단어.trycloudflare.com` 주소를 공유하면 끝.
터미널 창을 닫거나 Ctrl+C 하면 종료된다.

- 시간 제한 없음(단 best-effort — 예고 없이 끊길 수 있음)
- 재실행 시 주소 변경됨

## 방법 B — 고정 주소 터널 (Cloudflare 계정 + 도메인 필요)

며칠 이상 상시 공유용. 재시작해도 주소가 유지되고, 서비스로 등록하면 부팅 시 자동 시작된다.

**전제**: Cloudflare 무료 계정 + Cloudflare에 등록된 도메인 1개
(도메인이 없으면 방법 A만 가능. 도메인은 연 1~2만원대에 구입해 Cloudflare에 무료로 연결 가능)

```bash
# 1) 브라우저가 열리며 Cloudflare 로그인 → 도메인 선택
cloudflared tunnel login

# 2) 터널 생성 (이름은 자유)
cloudflared tunnel create epson-mi

# 3) 설정 파일 작성 — 경로:
#    Windows: C:\Users\<사용자>\.cloudflared\config.yml
#    macOS/Linux: ~/.cloudflared/config.yml
```

`config.yml` 내용 (`<터널ID>`는 2번 출력값, 도메인은 본인 것으로):

```yaml
tunnel: <터널ID>
credentials-file: C:\Users\<사용자>\.cloudflared\<터널ID>.json  # 2번에서 생성된 경로

ingress:
  - hostname: mi.example.com        # 원하는 서브도메인
    service: http://localhost:8000
  - service: http_status:404
```

```bash
# 4) DNS 연결 (mi.example.com → 터널)
cloudflared tunnel route dns epson-mi mi.example.com

# 5-a) 일단 실행해서 확인
cloudflared tunnel run epson-mi

# 5-b) 상시 운영: Windows 서비스로 등록 (관리자 PowerShell)
cloudflared service install
# 이후 부팅 시 자동 시작 + 끊김 시 자동 재연결
```

이제 아무 PC에서나 `https://mi.example.com` 으로 접속 가능.

### 접근 제한 걸기 (권장 — 무료 50인)

Cloudflare 대시보드 → Zero Trust → Access → Applications → **Add an application**
→ Self-hosted → 도메인 `mi.example.com` 지정 → 정책에서 허용할 **이메일 주소/도메인**(예: `@epson.co.kr`) 등록.
이후 접속 시 이메일 OTP 인증을 거쳐야만 화면이 열린다.

---

## 유지 조건·주의사항

- **PC 절전 금지**: 전원 옵션에서 절전 해제(노트북은 "덮개 닫을 때 아무 동작 안 함"). 절전 진입 시 터널·서버 모두 중단.
- **uvicorn도 함께 유지**: 터널은 통로일 뿐, 백엔드 프로세스가 꺼지면 502가 뜬다.
- 인메모리 스토어 특성상 **서버 재시작 시 업로드·승격 데이터가 초기화**된다(예시 데이터로 리셋). 상시 운영 단계에서는 DB 저장 전환 필요.
- 사내 보안 정책에 따라 외부 터널링이 금지된 조직도 있으니 IT 부서 확인 권장.
