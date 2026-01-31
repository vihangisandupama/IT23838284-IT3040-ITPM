const { test, expect } = require('@playwright/test');

test.describe('Negative Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.swifttranslator.com/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    try {
      await page.waitForSelector('.loading, [aria-busy="true"]', { state: 'hidden', timeout: 5000 });
    } catch (e) {}
  });

  // Helper function with improved selector finding
  async function findInputSelector(page) {
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
            await element.click({ force: true });
            await page.waitForTimeout(200);
            return element;
          }
        }
      } catch (e) {
        console.log(`Selector ${selector} not found or not visible`);
      }
    }
    
    await page.screenshot({ path: 'debug-input-not-found.png', fullPage: true });
    const bodyText = await page.textContent('body');
    console.log('Page body text (first 500 chars):', bodyText?.substring(0, 500));
    
    throw new Error('No input field found on the page');
  }

  // Helper function to get output with improved selectors
  async function getOutput(page) {
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
      } catch (e) {}
    }
    
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
    
    const bodyText = await page.textContent('body');
    if (bodyText) {
      const sinhalaRegex = /[\u0D80-\u0DFF]+/g;
      const matches = bodyText.match(sinhalaRegex);
      if (matches && matches.length > 0) {
        console.log('Found Sinhala text in body');
        return matches.join(' ');
      }
    }
    
    await page.screenshot({ 
      path: `debug-output-not-found-${Date.now()}.png`, 
      fullPage: true 
    });
    
    return 'No output found';
  }

  // Test function with retry logic for flaky tests
  async function runNegativeTest(page, testId, inputText, expectedOutput) {
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
        console.log(`Test ${testId} - Input: "${inputText}"`);
        console.log(`Test ${testId} - Expected Output: "${expectedOutput}"`);
        console.log(`Test ${testId} - Actual Output: "${output}"`);
        
        if (expectedOutput) {
          expect(output).toBe(expectedOutput);
        }
        
        return;
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

  test('Neg_Fun_0001: Chat-style shorthand "Thx" not converted', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0001', 'Thx machan!', 'ථx මචන්!');
  });

  test('Neg_Fun_0002: English short form "u" instead of "you"', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0002', 'u enne?', 'උ එන්නෙ?');
  });

  test('Neg_Fun_0003: Numeric shorthand "gr8" for "great"', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0003', 'eeka gr8!', 'ඒක gr8!');
  });

  test('Neg_Fun_0004: Mixed case Singlish input', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0004', 'OyaaTa KohoMadha?', 'ඔයාඨ ඛොහොමද?');
  });

  test('Neg_Fun_0005: Misspelled common Singlish phrase', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0005', 'oyata komada?', 'ඔයට කොමඩ?');
  });

  test('Neg_Fun_0006: Misspelled common Singlish phrase', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0006', 'thxzzz bro', 'තxzzz bro');
  });

  test('Neg_Fun_0007: Excessive character repetition', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0007', 'haiiiiii', 'හෛඊඊඉ');
  });

  test('Neg_Fun_0008: Incomplete Singlish word', async ({ page }) => {
    await runNegativeTest(page, 'Neg_Fun_0008', 'karann puLuvan', 'කරන්න් පුළුවන්');
  });

  test('Neg_Fun_0009: Mixed language gibberish', async ({ page }) => {
    const inputText = 'hello machan kohomada thing stuff work please thanks';
    await runNegativeTest(page, 'Neg_Fun_0009', inputText, 'hello මචන් කොහොමඩ thing stuff work please thanks');
  });

  // ✅ CORRECTED: Using the exact input and expected output from Excel sheet
  test('Neg_Fun_0010: Extremely long joined word stress test', async ({ page }) => {
    const inputText = 'hello kohomada oyata enne monawada mama yanne na enna epa oyata dhanne na epa hariyata yanna epa';
    const expectedOutput = 'hello කොහොමඩ ඔයට එන්නෙ මොනwඅඩ මම යන්නෙ න එන්න එප ඔයට දන්නෙ න එප හරියට යන්න එප';
    
    await runNegativeTest(page, 'Neg_Fun_0010', inputText, expectedOutput);
  });
});