# Dynamic Consistency Boundary Event Store for nodejs/typescript

Implementation of the Dynamic Consistency Boundary pattern for nodejs/typescript [described by Sara Pellegrini](https://sara.event-thinking.io/2023/04/kill-aggregate-chapter-1-I-am-here-to-kill-the-aggregate.html)

This repository contains the key concepts (event-store and event-handling) as well as specific implementations of each of these against different backend persistence layers (currently only Postgres). There is also an example CLI application, following Sara's Course/Students example implemented using this pattern.

## Prerequisites

It is important to have an understanding of the concepts of event-sourcing and projections before you start. Additionally read the article series above from Sara. An understanding of Domain Driven Design concepts such as the Aggregate (though we pretty much eliminate this here), Entities and Consistency Boundaries will help.

## Purpose

The purpose of this event-store and event-handling libraries are to fulfil the following:

-   Querying the event-store in a Command Handler prior to appending events to determine if the system is in a valid state.
-   Publishing new events to the event-store, while guaranteeing no _relevant_ events have been added in the meantime (avoids race conditions).
-   Enable a registry of Event Handlers (e.g. Projections, Process Managers) to update state or take other actions based on events. These can be updated synchronously with event publishes if required, avoiding the complexities of eventual consistency.

## Documentation

All documentation can be found in [the GitHub wiki](https://github.com/sennentech/dcb-event-sourced/wiki)

## Contributions

Contributions in the form of [issues](https://github.com/sennentech/dcb-event-sourced/issues), [pull requests](https://github.com/sennentech/dcb-event-sourced/pulls) or [discussions](https://github.com/sennentech/dcb-event-sourced/discussions) are appreciated.

## License

Licensed under an [MIT license](./LICENSE.md)

```

```
