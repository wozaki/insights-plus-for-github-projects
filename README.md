# Insights Plus for GitHub Projects

A Chrome extension that enhances GitHub Projects with insights like velocity prediction, completion date estimation, and more.

## Features

### 1. Burn-up Chart Enhancement

Extends GitHub Projects' burn-up chart with velocity analysis and completion prediction.

- 📈 **Current Velocity Display**: Displays the current velocity slope calculated from past data as a dashed line
- 🎯 **Ideal Velocity Display**: Displays the ideal velocity required to complete by the deadline as a solid line
- 📅 **Completion Prediction Date**: Displays the predicted completion date if the current velocity is maintained
- 📊 **Statistics Panel**: Displays total estimate, completed estimate, and completion percentage

### 2. Average Velocity Calculation across Multiple Iterations

Calculates and displays the average velocity across multiple iterations in bar/column charts.

## Installation

### Install from Release (Recommended)

1. Go to the [Releases](https://github.com/wozaki/insights-plus-for-github-projects/releases) page
2. Download the latest `.zip` file
3. Extract the zip file
4. Open `chrome://extensions/` in Chrome
5. Enable "Developer mode" in the top right
6. Click "Load unpacked extension"
7. Select the extracted folder

### Install in Developer Mode

1. Clone or download this repository
2. Install dependencies: `pnpm install`
3. Run development mode: `pnpm run dev`
4. Chrome will open automatically with the extension loaded

### Install from Production Build

1. Run `pnpm run build`
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" in the top right
4. Click "Load unpacked extension"
5. Select the `.output/chrome-mv3` folder

## Usage

### 1. Burn-up Chart Enhancement

#### GitHub Insights Configuration

Configure your chart with the following settings:

| Setting | Value |
|---------|-------|
| Layout | Stacked area |
| X-axis | Time |
| Y-axis | Count of items or Sum of field (Recommended: Sum of field with a Number field for Story points) |
| Date range | Custom range (Recommended: from observation start date to release target date + 1 month) |

#### How to Use

1. Open the GitHub Project Insights page (`/insights`)
2. When the burn-up chart is displayed, the extension will automatically activate
3. A statistics panel will appear below the chart
4. Velocity prediction lines will be overlaid on the chart

The deadline is automatically obtained from the end point of the graph's X-axis.

### 2. Average Velocity Calculation

#### GitHub Insights Configuration

Configure your chart with the following settings:

| Setting | Value |
|---------|-------|
| Layout | Bar, Column, Stacked bar, or Stacked column |
| X-axis | Custom field with Iteration field type |
| Y-axis | Count of items or Sum of field (Recommended: Sum of field with a Number field for Story points) |

#### How to Use

1. Open the GitHub Project Insights page (`/insights`)
2. When a bar/column chart with Iteration on X-axis is displayed, the extension will automatically calculate the average velocity
3. The average velocity will be displayed on the chart

## Development

### Install Dependencies

```bash
pnpm install
```

### Development (with HMR)

Start the development server with Hot Module Replacement:

```bash
pnpm run dev
```

This will:
- Start a dev server at `http://localhost:3000`
- Automatically open Chrome with the extension loaded
- **Auto-reload the extension when you make changes**

For Firefox development:

```bash
pnpm run dev:firefox
```

#### Customizing Development Environment

You can customize the browser behavior when starting the development server. Create a `.env.local` file in the project root and configure the following environment variables:

1. Copy the example file:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and set the following variables:

The `.env.local` file is included in `.gitignore` and will not be committed to Git. Refer to the `env.example` file as a template.

### Build for Production

```bash
pnpm run build
```

For Firefox:

```bash
pnpm run build:firefox
```

### Create Distribution Package

```bash
pnpm wxt zip
```

### Release

To create a new release:

1. Update the `version` field in `package.json`
2. Commit and push to the `main` branch

GitHub Actions will automatically:
- Create a git tag (e.g., `v1.0.0`)
- Build the extension
- Create a GitHub Release with the built `.zip` file

If the tag already exists, the workflow will skip the release.


### Tech Stack

- [WXT](https://wxt.dev/) - Next-gen Web Extension Framework
- TypeScript
- Vite (via WXT)
