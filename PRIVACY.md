# Privacy Policy

**Effective Date:** February 18, 2026

## Overview

Insights Plus for GitHub Projects respects your privacy. This extension enhances GitHub Projects Insights charts with velocity analysis and completion prediction. It operates entirely within your browser and does not collect, transmit, or store any data on external servers.

## Information We Access

This extension reads chart data from the GitHub Projects Insights page DOM (e.g., burn-up chart series, iteration labels, and point values) solely to perform local calculations such as velocity prediction and completion date estimation. This data is processed entirely within your browser and is never transmitted to any external server.

## Local Storage

All user settings are stored locally on your device using `chrome.storage.local`. The stored data includes:

- Velocity calculation lookback period (days) for burn-up charts
- Target completion dates for burn-up charts
- Iteration selection states for average velocity calculation

These settings are keyed by the chart URL so that different projects and insights pages can maintain independent configurations.

## No Tracking

We do not use any third-party analytics, tracking tools, or telemetry of any kind.

## Permissions

This extension requires only the `storage` permission to save and restore your chart analysis settings locally.

## Changes to This Policy

If we update this privacy policy, we will revise the "Effective Date" above and commit the changes to this repository.

## Contact

If you have any questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/wozaki/insights-plus-for-github-projects/issues).
