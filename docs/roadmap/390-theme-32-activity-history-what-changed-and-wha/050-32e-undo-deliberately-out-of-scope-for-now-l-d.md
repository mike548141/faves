- [x] **32e — undo, deliberately out of scope for now** `[L][design]`

A list of changes invites a button to reverse one, and "un-remove that
favourite" is genuinely useful. It is also a different feature: it needs every
event to be invertible, needs to define what undoing a `settings.change` means
when three more landed after it, and turns a recorder into a state machine.
**Park it, and note that 32a's `from`/`to` fields are what would make it
possible later** — which is why they are in the shape now, even though nothing
reads `from` yet.
