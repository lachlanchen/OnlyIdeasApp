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

네이티브 1.0.0 (9)은 간결한 조작부와 전체 너비의 초록으로 화면을 더 효율적으로 사용합니다. 본문 기본 크기는 18이며 페이지가 좌우로 밀리지 않습니다. 논문과 그림은 자동 저장되어 기기의 사본을 먼저 열고 클라우드 변경 사항을 반영합니다. 오프라인 보관으로 사본을 고정할 수 있습니다. O/i 아이콘은 청록·파랑·보라 그라데이션과 금색 점으로 정리했습니다. Apple 공개 심사에는 최종 스크린샷과 실제 Apple 로그인 확인이 남아 있습니다.

공개 열람실에는 명확히 표시된 원본 예제와 함께 실제 논문 두 편인 OpenAlex (CC0-1.0), Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0)가 있습니다. 원본 그림 네 개를 보존했습니다. 두 논문 모두 실제 변환 과정을 거쳤으며 로그인 없이 휴대폰 너비의 리더에서 확인했습니다.

[1.0.0 (9)](../docs/release-candidate-9.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
