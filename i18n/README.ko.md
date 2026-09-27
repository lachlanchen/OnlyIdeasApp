[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*깊이 읽고, 함께 생각하세요.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 개요

OnlyIdeas는 연구 논문을 함께 읽는 공간입니다. PDF나 공개 접근 PDF 링크를 가져오면 Mathpix가 수식과 그림을 보존하며, 독자는 본문에서 바로 토론할 수 있습니다. 새 가져오기는 기본적으로 공유이며 나만 보기로 바꿀 수 있습니다. 공개 전에는 이용 허가와 커뮤니티 검토를 거칩니다. 메모와 에이전트 대화는 비공개입니다.

설정 가능한 저비용 모델이 요청에 따라 독서 안내와 번역을 만듭니다. 생성된 글은 원문과 별도로 저장됩니다. GitHub에는 권리가 확인되고 명시적으로 공개된 논문 묶음만 저장됩니다. 별도의 GitHub 로그인과 지속적인 세션을 사용합니다.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## 시작하기

서비스 인증 정보를 연결하기 전에 운영 안내를 읽으세요. 설정은 보호된 파일에 보관하고 Git에 넣지 마세요.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## 설계

앱 코드, 공개 콘텐츠, 비공개 계정 데이터는 별도로 보관합니다. MMD는 TeX를 보존하고 문단 데이터는 필요할 때 생성합니다. 작업자는 중복 작업을 막고 페이지 수, 용량, 일일 사용량을 제한합니다.

## 상태

네이티브 1.0.0 (10)은 선명한 청록·파랑·보라 화면, 시스템·밝은·어두운 테마, 기기 언어를 기본으로 하는 11개 UI 언어를 지원합니다. 에이전트에 PDF, Word, 이미지, 텍스트를 비공개로 첨부할 수 있습니다. 문단 버튼과 기존 텍스트 선택으로 댓글을 남길 수 있습니다. 논문 번역을 동시에 요청해도 같은 판본의 작업과 결과를 재사용하며 수식과 그림을 보존합니다. 승인된 아이콘과 로컬 논문 캐시도 유지합니다. 테스트와 스토어 현황은 출시 노트를 확인하세요.

공개 열람실에는 명확히 표시된 원본 예제와 함께 실제 논문 두 편인 OpenAlex (CC0-1.0), Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0)가 있습니다. 원본 그림 네 개를 보존했습니다. 두 논문 모두 실제 변환 과정을 거쳤으며 로그인 없이 휴대폰 너비의 리더에서 확인했습니다.

개발 중: 데이터베이스 읽기 크레딧은 원자적 예약, 환불, 중복을 방지하는 승인된 공개 논문 보상을 지원합니다. 프로필에 잔액과 내역을 표시하고 공유 설정은 대화 위로 옮겼으며, 비공개 가져오기 전에 비용을 확인합니다. 새 기능은 11개 언어를 모두 지원합니다. 운영 서비스에서는 크레딧 차감과 월간 구독 구매를 아직 활성화하지 않았습니다.

다음 단계 준비: 스토어 가격, 구매 복원, 갱신 및 환불 검증을 갖춘 네이티브 월간 요금제입니다. 리더·리서처·스튜디오에는 매월 200/1,200/2,600 크레딧과 하루 40/80/160개의 에이전트 메시지가 포함됩니다. 스토어와 기기 검증이 끝날 때까지 구매는 비활성화됩니다.

1.0.2 (13)은 사이드바와 키보드 단축키를 갖춘 네이티브 Mac 앱(macOS 13 이상, Intel 및 Apple Silicon)과 Apple Watch 동반 앱(watchOS 11 이상)을 추가합니다. iPhone 읽기 메뉴에서 공개 논문의 발췌문을 직접 보내면 최근 세 개를 시계에서 글자 크기를 조절하며 오프라인으로 읽을 수 있습니다. 전체 수식과 그림은 iPhone과 Mac에 남으며 비공개 논문, 채팅, 계정 인증 정보는 시계로 전송하지 않습니다. 심사 상태는 릴리스 기록을 참조하세요. 구독 활성화는 운영자 테스트에 한정됩니다.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (13)](../docs/release-candidate-13.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

## 후원

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 인용

연구에 이 저장소를 활용하면 인용해 주세요. GitHub는 CITATION.cff를 읽어 인용 정보를 제공합니다. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
