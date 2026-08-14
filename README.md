# SAIF Community Hub

The SAIF Community Hub is the literature-grounded companion to the [SAIF Results Atlas](https://sinai-computational-pathology.github.io/saif-results-atlas/). It connects approved aggregate experiment results with testable organ–demographic hypotheses and public scientific discussion.

## Explore

- [Open the Community Hub](https://sinai-computational-pathology.github.io/saif-community-hub/)
- [Inspect the Results Atlas](https://sinai-computational-pathology.github.io/saif-results-atlas/)
- [Join a discussion](https://github.com/sinai-computational-pathology/saif-community-hub/discussions)

The Hub contains literature hypotheses, evidence status, confounders, and suggested validation studies. The Results Atlas remains the sole public source for approved experiment results. Neither site contains patient-level data, identifiers, report text, source paths, or a browser-writable review backend.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Use Discussions for scientific conversation, Issues for confirmed site or content defects, and pull requests for reviewed changes to the structured claim corpus.

## Local validation

```bash
npm ci
npm run check
```

`claims/*.yaml` is the public source of truth. Claim IDs are permanent: retire a claim rather than deleting or renumbering it.

## Citation

The version cited by the paper will be preserved under `/supplement/v1/` with a release manifest and file checksums. Until the manuscript citation is finalized, cite the repository URL and release tag used for your analysis.
