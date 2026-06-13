# Panelist Risk Checklist

## Highest-Risk Contradictions
- The paper says 60% or even `c0%`, but the implemented system uses 74%.
- A copied paragraph about an RND, nutritionist, food intakes, and a cloud database appears in the technical chapter.
- Mobile parity is overstated; teacher mobile is explicitly not ready in the current app.
- Figure 30 claims immediate mobile push notifications without code evidence for a push stack.
- Figure 11 claims a 30-second lesson completion rule that the audit could not verify in code.

## Likely Panel Questions
- Why does the paper say 60% when the live teacher intervention screen says 74%?
- Why is there a nutritionist paragraph in a school LMS paper?
- Can you demonstrate the teacher mobile app now?
- How exactly are push notifications sent to mobile clients?
- Where is the 30-second lesson completion rule enforced?
- Why are Table 17 and Table 18 both Student Profile?
- Which figure is correct for Table 31: Student Performance or View Evaluations?
- Is AI processing strictly local, or can it fall back to cloud providers?

## Best Defensive Fix Order
1. Correct every threshold statement and diagram from 60/c0 to 74.
2. Remove the copied nutritionist/RND paragraph entirely.
3. Re-audit every Figure 8-39 caption and every Table 9-49 title/number.
4. Narrow the mobile scope to student-first and remove unsupported push claims.
5. Replace unsupported 30-second tracking language with real implemented logic.
