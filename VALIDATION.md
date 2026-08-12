# SWE CH2–CH32 Integration Validation

## Scope

- Added **29 individual full lesson files** for Days **2–30**.
- Updated `index.html` to load each new lesson before the existing Day 31 lesson.
- Existing full Day **31 (Partitioning)** and Day **32 (Replication)** files are intentionally unchanged.
- No Day 37 content was generated.
- No Pessimistic Locking lesson was generated.

## Content preservation

- Source processed for Days 2–30: **528,456 characters**.
- Rendered lesson sections: **995**.
- Generated lesson payload: **925,719 bytes**.
- Source chapters carrying an extraction-limit warning: **18**; every warning remains visible as a warning callout.
- Weighted normalized source-token preservation: **99.56%** (minimum chapter result: **97.87%**).
- The comparison excludes formatting-only differences such as Markdown heading markers, repeated day/title labels, and reader-only citation/entity artifacts that cannot function in the static site.

## Automated checks

- `node --check` passed for all 29 generated JavaScript lesson files.
- A Node VM loaded all 29 lesson objects successfully into `window.FULL_LESSONS`.
- Every lesson has metadata, tags, a core principle, non-empty sections, and key takeaways.
- `index.html` contains exactly one loader reference for each Day 2–30 lesson and retains the existing Day 31 and Day 32 references.
- No `day-37`, `CH37`, or `pessimistic locking` string appears in the generated changes.
- No ChatGPT reader entity/citation markers or chapter boundary comments remain in lesson payloads.
- The Git patch passed `git apply --check` and a clean apply-and-byte-compare test.

## Chapter metrics

| Day | Lesson | Source chars | Sections | Output bytes | Extraction warning preserved | Token preservation |
|---:|---|---:|---:|---:|:---:|---:|
| 2 | Caching | 14,354 | 18 | 22,976 | No | 99.27% |
| 3 | Load Balancing | 20,624 | 22 | 34,029 | No | 99.50% |
| 4 | Reverse Proxies | 20,016 | 23 | 33,424 | No | 99.55% |
| 5 | API Gateways | 12,661 | 39 | 24,379 | No | 99.17% |
| 6 | CI/CD | 20,149 | 24 | 29,010 | Yes | 98.88% |
| 7 | Docker | 11,942 | 36 | 23,314 | No | 99.21% |
| 8 | Kubernetes | 13,131 | 41 | 26,214 | No | 99.24% |
| 9 | Service Discovery | 11,443 | 36 | 23,317 | No | 98.97% |
| 10 | Circuit Breakers | 20,149 | 22 | 31,255 | Yes | 99.84% |
| 11 | Timeouts | 20,149 | 34 | 32,014 | Yes | 99.85% |
| 12 | Retries | 20,149 | 31 | 36,730 | Yes | 99.85% |
| 13 | Exponential Backoff | 20,148 | 34 | 37,178 | Yes | 99.85% |
| 14 | Idempotency | 20,149 | 35 | 35,610 | Yes | 99.52% |
| 15 | Message Queues | 20,148 | 32 | 37,475 | Yes | 99.92% |
| 16 | Pub/Sub | 20,149 | 33 | 38,611 | Yes | 99.91% |
| 17 | Event-Driven Architecture | 20,149 | 38 | 36,434 | Yes | 99.83% |
| 18 | Distributed Transactions | 14,629 | 37 | 28,326 | No | 98.95% |
| 19 | Saga Pattern | 20,149 | 45 | 35,340 | Yes | 99.83% |
| 20 | Dead Letter Queues | 16,727 | 43 | 30,879 | No | 97.87% |
| 21 | Cron Jobs | 14,676 | 42 | 28,594 | No | 99.05% |
| 22 | WebSockets | 15,574 | 43 | 28,769 | No | 99.24% |
| 23 | Long Polling | 20,149 | 38 | 32,641 | Yes | 99.85% |
| 24 | Server-Sent Events | 20,149 | 37 | 33,717 | Yes | 99.84% |
| 25 | Database Indexing | 20,149 | 40 | 36,476 | Yes | 99.86% |
| 26 | Query Optimization | 20,149 | 42 | 35,486 | Yes | 99.86% |
| 27 | N+1 Queries | 20,149 | 33 | 35,267 | Yes | 99.85% |
| 28 | Connection Pooling | 20,149 | 33 | 31,828 | Yes | 99.84% |
| 29 | Read Replicas | 20,149 | 33 | 33,085 | Yes | 99.64% |
| 30 | Sharding | 20,148 | 31 | 33,341 | Yes | 99.78% |

## Packaging

- The overlay archive contains the modified `index.html`, all 29 new lesson files, this validation report, the machine-readable validation data, and the conversion generator for traceability.
- The companion patch modifies `index.html` and adds the same 29 lesson files.
