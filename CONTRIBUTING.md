# Contributing to the SAIF Community Hub

Thank you for helping test, refine, or challenge these hypotheses. Scientific disagreement is welcome; claims change only after human review of the evidence.

## Choose the right channel

- **Discussion:** interpretation, alternative explanations, new literature, replication ideas, or collaboration interest.
- **Issue:** a reproducible website defect, accessibility problem, broken link, or confirmed content inconsistency.
- **Pull request:** a concrete change to `claims/*.yaml` that follows an accepted discussion or supplies directly reviewable evidence.

Do not submit protected health information, patient or specimen identifiers, restricted data, credentials, private paths, unpublished sensitive results, or text you do not have the right to share. Everything submitted here is public.

## Claim changes

1. Identify the organ–demographic combination and permanent claim ID.
2. Explain whether the change strengthens, narrows, challenges, or retires the claim.
3. Provide a DOI, PMID, or stable source URL and identify the part of the source supporting the exact statement.
4. Preserve cautious causal language, particularly for race and self-reported ancestry.
5. Run `npm run check` before requesting review.

Claim IDs must never be renumbered or deleted. Set `status: retired` when a claim should no longer be presented as active. New claims begin as `status: proposed`.

## Review standard

At least one project maintainer must verify source metadata and exact claim support. Changes affecting causal interpretation, demographic framing, or the paper supplement require review by a domain expert. A completed experiment or community discussion is not automatically a manuscript claim.
