# Share and discuss a paper

Use **Share** on a paper card or in the reader's options. Public papers open a
preview with the title, authors, app icon and links to read in the browser or app.
Private papers must be made public through the existing permission and license
confirmation before they can have a public reading link.

The sharing menu offers the device share sheet, WeChat, a title-and-link draft
for EchoMind, and two AiMemo drafts: **save to read later** and **explore ideas**.
Review a draft in its destination before sending. The EchoMind and AiMemo choices
currently copy drafts while their direct receiving screens are qualified.

## Mention a saved paper

In Agent, type **@** or choose **Mention a paper**. Select up to three accessible
papers. Selected titles appear above the composer and can be removed individually.
Questions about these papers reuse their saved transcripts. Mentioning a paper
does not download or transcribe it again.

Choose **Quote message** on either your message or an OnlyIdeas response to bring
it into the composer. A quote stays in the current conversation. Failed sends
retain the draft, selected papers and quote; changing accounts clears them.

## Public-link contract

- Saved paper: `https://agent.onlyideas.art/share/paper/<id>`
- Research result: `https://agent.onlyideas.art/share/research/<id>`

The preview checks public access even when its visitor has an owner's session.
Private, removed and withdrawn papers do not expose their title or body through
this route. Preview text is escaped and no paper content is executed.

Mention and quote inputs contain IDs. The server resolves their text and access
rights, checks the current account and conversation, and checks them again when
an agent starts the request. Earlier quotes and paper text are reference material,
not permission to perform actions.
