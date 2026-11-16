# Daily Expense Tracker

A personal expense tracker built with **HTML, CSS and vanilla JavaScript**. It uses browser `localStorage` for persistence, so no account, backend or build tools are required.

Daily Expense Tracker Link : https://mourya-2007.github.io/daily-expense-tracker/

## Features

- Dashboard with today's spending, monthly total, remaining budget and recent activity
- Add, edit and delete expenses
- Expense categories, dates and optional notes
- Transaction history with search and category filtering
- Monthly budget and progress indicator
- Spending trend and category analytics with Chart.js
- Responsive liquid-glass interface with light/dark modes and INR formatting

## Run locally

1. Clone this repository:
   ```bash
   git clone https://github.com/mourya-2007/daily-expense-tracker.git
   ```
2. Open the folder in VS Code.
3. Open `index.html` in a browser, or use the Live Server extension.

No installation or build step is required.

## Data and privacy

Expenses and the budget are stored in the current browser profile using `localStorage`. They are not uploaded or synced across devices. Clearing the browser's site data can delete them. Chart.js and Google Fonts are loaded from CDNs and need an internet connection.

## Tech stack

HTML5 · CSS3 · Vanilla JavaScript · localStorage · Chart.js

## Project structure

```text
daily-expense-tracker/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```


## Appearance

The interface supports liquid-glass light and dark modes. Your selected appearance is remembered in the browser using local storage.
