const { test, expect } = require('@playwright/test');

test.describe('Positive Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.swifttranslator.com/');
    // Wait for page to load with multiple strategies
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Wait for any loading indicators to disappear
    try {
      await page.waitForSelector('.loading, [aria-busy="true"]', { state: 'hidden', timeout: 5000 });
    } catch (e) {
      // Continue if no loading indicator found
    }
  });

  // Helper function with improved selector finding
  async function findInputSelector(page) {
    // First, try to wait for input to be visible
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const possibleSelectors = [
      'textarea',
      'input[type="text"]',
      'input[placeholder*="singlish" i]',
      'input[placeholder*="type" i]',
      'input[placeholder*="enter" i]',
      '[contenteditable="true"]',
      '.input-field',
      '#input',
      'input'
    ];

    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`Found input using selector: ${selector}`);
            // Try to click to ensure focus
            await element.click({ force: true });
            await page.waitForTimeout(200);
            return element;
          }
        }
      } catch (e) {
        console.log(`Selector ${selector} not found or not visible`);
      }
    }
    
    // Debug: Take screenshot and show page content
    await page.screenshot({ path: 'debug-input-not-found.png', fullPage: true });
    const bodyText = await page.textContent('body');
    console.log('Page body text (first 500 chars):', bodyText?.substring(0, 500));
    
    throw new Error('No input field found on the page');
  }

  // Helper function to get output with improved selectors
  async function getOutput(page) {
    // Wait a bit for translation to appear
    await page.waitForTimeout(1000);
    
    const possibleOutputSelectors = [
      'textarea[readonly]',
      'div.output',
      '.output-area',
      '#output',
      '.sinhala-output',
      '[aria-label*="output" i]',
      'pre',
      'div[role="textbox"]',
      '.translation-result',
      '.result',
      '[class*="output" i]',
      '[class*="result" i]',
      '[class*="translation" i]'
    ];

    for (const selector of possibleOutputSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            // Try multiple methods to get text
            let text = await element.textContent();
            if (!text || text.trim().length === 0) {
              text = await element.getAttribute('value');
            }
            if (!text || text.trim().length === 0) {
              text = await element.inputValue();
            }
            
            if (text && text.trim().length > 0) {
              console.log(`Found output using selector: ${selector}`);
              return text.trim();
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Alternative: Look for any element containing Sinhala Unicode characters
    const sinhalaLocator = page.locator('*').filter({
      hasText: /[\u0D80-\u0DFF]/
    }).first();
    
    if (await sinhalaLocator.count() > 0) {
      const text = await sinhalaLocator.textContent();
      if (text && text.trim().length > 0) {
        console.log('Found Sinhala text using Unicode filter');
        return text.trim();
      }
    }
    
    // Last resort: Get all text from body and filter for Sinhala
    const bodyText = await page.textContent('body');
    if (bodyText) {
      // Look for Sinhala characters
      const sinhalaRegex = /[\u0D80-\u0DFF]+/g;
      const matches = bodyText.match(sinhalaRegex);
      if (matches && matches.length > 0) {
        console.log('Found Sinhala text in body');
        return matches.join(' ');
      }
    }
    
    // Debug: Take screenshot
    await page.screenshot({ 
      path: `debug-output-not-found-${Date.now()}.png`, 
      fullPage: true 
    });
    
    return 'No output found';
  }

  // Test function with retry logic for flaky tests
  async function runTranslationTest(page, testId, inputText, expectedOutput) {
    let retries = 3;
    
    while (retries > 0) {
      try {
        const inputSelector = await findInputSelector(page);
        
        // Clear any existing text
        await inputSelector.clear();
        await page.waitForTimeout(200);
        
        // Type text slowly to simulate real user input
        await inputSelector.fill(inputText);
        await page.waitForTimeout(1500);
        
        const output = await getOutput(page);
        console.log(`Test ${testId} - Actual Output:`, output);
        
        // Check if output contains expected text
        if (typeof expectedOutput === 'string') {
          expect(output).toContain(expectedOutput);
        } else if (Array.isArray(expectedOutput)) {
          for (const expected of expectedOutput) {
            expect(output).toContain(expected);
          }
        }
        
        return; // Success, exit function
      } catch (error) {
        retries--;
        console.log(`Test ${testId} failed, ${retries} retries left. Error:`, error.message);
        
        if (retries === 0) {
          throw error;
        }
        
        // Refresh page and retry
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
    }
  }

  // Test cases
  test('Pos_Fun_0001: Convert short daily greeting', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0001', 'suba udhaeesanak', 'සුබ උදෑසනක්');
  });

  test('Pos_Fun_0002: Convert mixed Singlish + English text', async ({ page }) => {
    const inputText = 'api heta Kandy yanna hadhanavaa, train reservation ekak kalin karanna oone machan. Hotel booking ekak Booking.com eken karagamu, WiFi saha parking thiyenavaa.';
    await runTranslationTest(page, 'Pos_Fun_0002', inputText, ['අපි හෙට Kandy යන්න හදනවා', 'train reservation', 'WiFi']);
  });

  test('Pos_Fun_0003: Convert short request phrase', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0003', 'karuNaakara vathura ekak dhenna', 'කරුණාකර වතුර එකක් දෙන්න');
  });

  test('Pos_Fun_0004: Simple sentence with proper spacing', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0004', 'mama gedhara yanavaa.', 'මම ගෙදර යනවා.');
  });

  test('Pos_Fun_0005: Joined words without spaces', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0005', 'mamagedharayanavaa', 'මමගෙදරයනවා');
  });

  test('Pos_Fun_0006: Compound sentence', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0006', 'mama gedhara yanavaa, haebaeyi vahina nisaa dhaenma yannee naee.', 'මම ගෙදර යනවා, හැබැයි වහින නිසා දැන්ම යන්නේ නෑ.');
  });

  test('Pos_Fun_0007: Complex sentence with condition', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0007', 'oya enavaanam mama balan innavaa.', 'ඔය එනවානම් මම බලන් ඉන්නවා.');
  });

  test('Pos_Fun_0008: Imperative command', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0008', 'vahaama enna.', 'වහාම එන්න.');
  });

  test('Pos_Fun_0009: Negative sentence form', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0009', 'mama ehema karannee naehae.', 'මම එහෙම කරන්නේ නැහැ.');
  });

  test('Pos_Fun_0010: Greeting phrase with exclamation', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0010', 'aayuboovan!', 'ආයුබෝවන්!');
  });

  test('Pos_Fun_0011: Polite request', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0011', 'karuNaakaralaa mata podi udhavvak karanna puLuvandha?', 'කරුණාකරලා මට පොඩි උදව්වක් කරන්න පුළුවන්ද?');
  });

  test('Pos_Fun_0012: Informal phrasing', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0012', 'eeyi, ooka dhiyan.', 'ඒයි, ඕක දියන්.');
  });

  test('Pos_Fun_0013: Day-to-day expression', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0013', 'mata nidhimathayi.', 'මට නිදිමතයි.');
  });

  test('Pos_Fun_0014: Multi-word expression', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0014', 'mata oona', 'මට ඕන');
  });

  test('Pos_Fun_0015: Repeated words for emphasis', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0015', 'hari hari', 'හරි හරි');
  });

  test('Pos_Fun_0016: Past tense sentence', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0016', 'mama iiyee gedhara giyaa.', 'මම ඊයේ ගෙදර ගියා.');
  });

  test('Pos_Fun_0017: Future tense sentence', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0017', 'mama heta enavaa', 'මම හෙට එනවා');
  });

  test('Pos_Fun_0018: Singular pronoun usage', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0018', 'mama yanna hadhannee.', 'මම යන්න හදන්නේ.');
  });

  test('Pos_Fun_0019: Plural pronoun usage', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0019', 'api yamu.', 'අපි යමු.');
  });

  test('Pos_Fun_0020: Request with varying politeness', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0020', 'karuNaakara eeka mata adha dhenavadha?', 'කරුණාකර ඒක මට අද දෙනවද?');
  });

  test('Pos_Fun_0021: English technical term embedded', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0021', 'Zoom meeting ekak thiyennee.', 'Zoom meeting එකක් තියෙන්නේ.');
  });

  test('Pos_Fun_0022: Place name in sentence', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0022', 'siiyaa Colombo yanna hadhannee.', 'සීයා Colombo යන්න හදන්නේ.');
  });

  test('Pos_Fun_0023: English abbreviation', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0023', 'ID eka genna', 'ID එක ගෙන්න');
  });

  test('Pos_Fun_0024: Short sentence with English abbreviation', async ({ page }) => {
    await runTranslationTest(page, 'Pos_Fun_0024', 'OTP eka SMS ekak evanna', 'OTP එක SMS එකක් එවන්න');
  });
});