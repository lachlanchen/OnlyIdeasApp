import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makePaper } from './domain.mjs';
export function seed(store) {
  if (store.paper('a-place-for-questions')) return;
  const mmd = String.raw`# A place for questions

An original OnlyIdeas reading sample · not a published research paper

## Read a little more slowly

A good research conversation often begins with a small question in the margin. What does this assumption mean? Does the result still hold outside the experiment? What would convince us otherwise?

OnlyIdeas keeps those questions close to the passage that inspired them. Select a few words, then choose **Discuss selection**. Your private notes stay separate from the shared conversation.

## An equation, with room to breathe

The expected value of a discrete quantity is a weighted average. If outcome $x_i$ has probability $p_i$, then

\begin{equation}
\mathbb{E}[X] = \sum_{i=1}^{n}p_i x_i, \qquad \sum_{i=1}^{n} p_i = 1.
\end{equation}

For a fair six-sided die, each outcome has probability $1/6$, so the expected value is $3.5$. This is a long-run average, not a possible result of one throw.

## Keep the picture with the idea

![A reading cycle: read, question, connect, and return to the source](figures/reading-cycle.svg)

**Figure 1.** A reading loop. Questions and connections lead back to the original source. This illustration was made for the OnlyIdeas sample.

| Reading move | A useful question |
| --- | --- |
| Notice the claim | What, precisely, is being claimed? |
| Inspect the evidence | Which figure or experiment supports it? |
| Find the limit | Under what conditions could it fail? |

## Read across languages

**English** · A question is a beginning, not an interruption.

**简体中文** · 一个问题是思考的开始。

**日本語** · 問いから、新しい理解が始まる。

Translations and reading guides appear alongside the source and are labeled as generated. The original text, equations and figures remain available for comparison.
`;
  const p = makePaper({ id: 'a-place-for-questions', title: 'A place for questions', authors: 'OnlyIdeas · original reading sample', owner: 'system', mmd, category: 'Start here', license: 'CC0-1.0', source: 'https://onlyideas.art', assets: [{ path: 'figures/reading-cycle.svg' }] });
  p.visibility = 'public'; p.sample = true; store.savePaper(p);
  const dir = join(store.directory, 'papers', p.id, 'figures'); mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(join(dir, 'reading-cycle.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300"><rect width="900" height="300" rx="22" fill="#edf1e9"/><path d="M155 145H745M745 170Q745 245 450 245Q155 245 155 170" stroke="#779282" stroke-width="2" fill="none"/><g font-family="Georgia,serif" font-size="24" fill="#234b42" text-anchor="middle"><g><circle cx="155" cy="125" r="56" fill="#fffdf7"/><text x="155" y="133">Read</text></g><g><circle cx="352" cy="125" r="56" fill="#fffdf7"/><text x="352" y="133">Question</text></g><g><circle cx="548" cy="125" r="56" fill="#fffdf7"/><text x="548" y="133">Connect</text></g><g><circle cx="745" cy="125" r="56" fill="#fffdf7"/><text x="745" y="133">Return</text></g></g><text x="450" y="278" text-anchor="middle" fill="#63786b" font-family="sans-serif" font-size="14">Every idea has a source. Keep it close.</text></svg>`, { mode: 0o600 });
}
