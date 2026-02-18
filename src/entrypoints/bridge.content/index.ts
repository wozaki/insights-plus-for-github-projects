import { defineContentScript } from 'wxt/utils/define-content-script';
import { waitAndSend } from './svg-extractor';
import { PROJECT_INSIGHTS_URL_PATTERNS } from '../content/shared/page-detector';

export default defineContentScript({
  matches: PROJECT_INSIGHTS_URL_PATTERNS,
  world: 'MAIN',
  runAt: 'document_idle',

  main() {
    window.addEventListener('insights-plus-request-data', () => {
      waitAndSend();
    });
  },
});
