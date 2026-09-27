[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*깊이 읽고, 함께 생각하세요.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 개요

OnlyIdeas는 연구 논문을 차분하게 읽고 이야기하는 공간입니다. 자신의 PDF나 오픈 액세스 PDF 링크를 가져오고, Mathpix로 수식과 그림을 보존하며, 읽기 화면에서 바로 문단을 토론합니다. 개인 논문과 메모는 처음에는 비공개입니다.

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

클라우드 서비스가 운영 중입니다. 1.0.0(6)은 기존 TestFlight 및 Google Play 내부 테스트 그룹에서 사용할 수 있습니다. Google 정식 출시 심사를 요청했으며 심사 전에 자동 검사가 진행될 수 있습니다. Apple 정식 제출에는 최종 iOS 스크린샷과 실제 Apple 로그인 검증이 남아 있습니다. 실제로 가져온 논문의 그림, 표, 수식을 휴대폰 크기의 화면에서 확인했습니다.

0.3에서는 iOS SwiftUI 화면과 Android 기본 UI, 크기를 조절할 수 있는 큰 본문, 별도 프로필 페이지, 기록이 저장되는 에이전트 대화를 제공합니다. 워크스테이션의 에이전트가 공개 연구 색인을 검색하고 PDF를 내려받으며, LazyEdge를 통해 로컬 모델을 사용합니다. 변환 및 추가를 선택하면 수식과 그림을 보존한 비공개 Mathpix 읽기 자료를 만듭니다. 빌드와 테스트 상태는 네이티브 업데이트 기록에서 확인할 수 있습니다.

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
