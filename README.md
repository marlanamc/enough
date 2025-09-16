# Enough

Enough is a Next.js application that helps you plan your day around energy instead of just time. Add tasks, see how they fill your energy “cup” or “circle”, drag them into a schedule, and celebrate when you’ve done enough.

## Features

- **Energy Visualization** – Choose between donut or cup layouts that fill as you add tasks, with color-coding by category.
- **Task Management** – Add quick tasks inline, use templates, mark tasks complete, and track priorities.
- **Daily Schedule** – Drag and drop tasks into working hours to plan the flow of your day.
- **Personalization** – Customize daily capacity, categories, templates, themes, and notification preferences.
- **Progress & Achievements** – Track streaks, total energy managed, and unlock achievements as you go.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install

```bash
git clone https://github.com/marlanamc/enough.git
cd enough
npm install
```

### Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` to use the app.

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
  app/          # Next.js app directory (layout, pages, styles)
  components/   # Reusable UI components built with Radix + tailwind styles
  lib/          # Shared utilities
```

## Tech Stack

- Next.js 13 (App Router)
- React 18
- TypeScript
- Tailwind CSS & shadcn/ui components
- lucide-react icons
- ESLint & TypeScript for linting and types

## Environment

Environment variables are not required for local development. When adding secrets, create a `.env` file (ignored by git).

## Contributing

Pull requests and issues are welcome! If you plan to contribute regularly:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/my-feature`).
3. Commit your changes (`git commit -m "feat: add my feature"`).
4. Push the branch (`git push origin feat/my-feature`).
5. Open a pull request describing your work.

Please run `npm run lint` before submitting a PR.

## License

MIT © Marlana Creed

