# Choose your research feed

Open **Tune your feed** on Research for you to select topics and journals. Add
specific interests as comma-separated keywords. The starting selection covers
imaging, optics and biomedicine; **Restore recommended defaults** brings it back.
**All journals** broadens journal coverage while keeping your subject choices and
the English-language, open-access metadata filters.

The same choices guide the home feed and daily papers. Explicit searches remain
independent, so searching for a paper does not change what you follow.

## Change preferences in Agent

Examples:

- “Follow microscopy and organoids mainly in Nature Methods and Optica.”
- “Add optics to my topics.”
- “Unfollow organoids.”
- “Set my interests to cancer immunotherapy.”
- “Show my preferences.”
- “Reset my recommendations.”

Agent can also edit the reading language, reminder time and activity-alert
preferences. Native reminders require device notification permission. Clear
named selections work without a model request. More conversational instructions
use the existing research model, followed by server validation. The response
reports the settings actually saved. An unknown journal or invalid request does
not silently broaden the selection.

## Implementation and qualification

- Shared preference validation preserves unrelated settings and local account
  ownership. Revision checks reject stale forms and delayed model plans.
- Exact journal IDs prevent Nature Methods from being treated as Nature. Public
  metadata caches include the selection; private paper access is resolved afterward.
- A selected single journal can fill a page. Multi-journal selections retain
  diversity. The existing bounded first-page client cache is invalidated on edits.
- Retrieved content, attachments and quoted messages cannot authorize preference
  changes. The worker can change only the allowlisted reading fields.
- New editor labels are included in all 11 interface languages.

Web, Android and Apple native source are maintained together. Qualification and
delivery states are recorded separately in the adjacent review receipt; an
Android or browser pass does not establish an Apple runtime pass.
