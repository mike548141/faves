- [ ] **26c — What happens when the menu moves under it** `[M]` 🚩 **the real
  design problem.** A saved order references dishes and prices that a refresh
  can change, rename or remove — and `renames.js` already exists precisely
  because ids move. So recall has to answer honestly: *this dish is $2 dearer
  than when you saved it*, *this dish is gone*. Silently recalling a stale price
  into the tally would make the app lie about the total, which is the one thing
  the price work has been careful never to do. Model it on the refresh caveat
  (ADR 0036): say what changed, let the reader decide.
