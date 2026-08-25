# SAIF Community Hub

The SAIF Community Hub is a community hypothesis registry and literature-grounded companion to the [SAIF Results Atlas](https://sinai-computational-pathology.github.io/saif-results-atlas/). It connects an approved aggregate observation to a possible mechanism, observable prediction, proposed validation, and public scientific discussion.

## Explore

- [Open the Community Hub](https://sinai-computational-pathology.github.io/saif-community-hub/)
- [Explore residual signals](https://sinai-computational-pathology.github.io/saif-community-hub/#/signals)
- [Inspect the Results Atlas](https://sinai-computational-pathology.github.io/saif-results-atlas/)
- [Propose a hypothesis](https://github.com/sinai-computational-pathology/saif-community-hub/discussions/new?category=ideas)

The living Hub reads the Atlas's public aggregate bundle at runtime so visitors can start from a result without creating a second results release. Literature evidence and claim-level SAIF evidence remain separate; literature plausibility is not treated as experimental support. Neither site contains patient-level data, identifiers, report text, source paths, or a browser-writable review backend.

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
