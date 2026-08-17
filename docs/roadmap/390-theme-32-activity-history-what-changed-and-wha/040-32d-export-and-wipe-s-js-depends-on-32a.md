- [ ] **32d — export and wipe** `[S][js]` 🔗 **depends on 32a**

Add the log to Theme 12's export payload and to `personal-data.js`'s clear path,
and to whatever Reset ends up destroying. Do this **in the same change as 32a**,
not after: a personal store that the export and the wipe don't know about is the
kind of gap nobody finds until it matters.
