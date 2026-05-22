# Poker App

Poker App is a Vue 3 + Vite application for managing Team TFT poker nights. It tracks the Season 20 schedule, participant standings, points rules, and a tournament-mode blind timer so the group can run poker sessions from one focused dashboard.

## About Team TFT and Multica

This app was designed and created for Team TFT with help from Multica AI agents powered by Hermes. In this workspace, agents such as Teemo and teammates act as local coding scouts: they inspect issues, update the codebase, run checks, and coordinate through Multica so the project can move quickly while keeping the work reviewable.

## Features

- Season 20 overview with schedule, hosts, and the next poker night callout.
- Rankings and standings page seeded with Team TFT participants.
- Clear points rules for placement, hosting, and kill points.
- Tournament mode with a live blind timer, editable blind levels, and reset controls.
- Participant management for adding, removing, and scoring players.
- Modern purple-themed Vue interface built for quick use during poker nights.

## Tech Stack

- [Vue 3](https://vuejs.org/) with `<script setup>` and TypeScript
- [Vite](https://vite.dev/) for local development and builds
- [Vue Router](https://router.vuejs.org/) for app navigation
- [Vitest](https://vitest.dev/) for unit tests
- ESLint, Oxlint, and Prettier for code quality

## Project Setup

Install dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run dev
```

Run unit tests:

```sh
npm run test
```

Type-check and build for production:

```sh
npm run build
```

Run linting:

```sh
npm run lint
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar). Disable Vetur if it is installed.

## Type Support for `.vue` Imports in TypeScript

TypeScript cannot handle type information for `.vue` imports by default, so this project uses `vue-tsc` for type checking. In editors, Volar makes the TypeScript language service aware of `.vue` types.
