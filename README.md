# IT23838284-IT3040-ITPM

## IT3040- ITPM Project Assignment 01
## IT23838284 - Sandupama D H V


Singlish to Sinhala Translator for Playwright Automation Tests
## Project Overview 
This project contains an automated test suite developed using Playwright to evaluate the accuracy, robustness, and UI behavior of the Singlish to Sinhala transliteration system available at https://www.swifttranslator.com/

Prerequisites are Node.js, npm and Git

## Installation
Install Dependencies - npm install
Install Playwright Browsers - npx playwright install

Run All Tests - npx playwright test
Generate Test Report - npx playwright show-report

## Test Coverage
### 1. Sentence Structures
    Simple, compound, and complex sentences
    Interrogative and imperative forms
    Positive and negative sentence forms
    
### 2. Daily Language Usage
    Common greetings, requests, and responses
    Polite vs informal phrasing
    Day-to-day expressions

### 3. Word Combinations & Phrases
    Multi-word expressions and collocations
    Joined vs segmented word variations
    Repeated words for emphasis

### 4. Grammatical Forms
    Tense variations (past, present, future)
    Negation patterns
    Singular/plural usage and pronoun variations
    Request forms with varying politeness levels

### 5. Input Variations
    Short (≤30 chars), Medium (31-299 chars), Long (≥300 chars)  
    Mixed language content
    Punctuation, numbers, and formatting
    Informal language and slang

### Configuration
#### The playwright.config.js file includes:
    Browser configuration (Chromium, Firefox, WebKit) 
    Viewport settings
    Timeout configurations
    Screenshot and video recording on failure

### Test Data Management
    positive- 24 positive sentence 
    negative- 10 negative sentence 
    UI- 1 UI sentence 

### Expected Outputs
    Test ID (following Pos_Fun_, Neg_Fun_, Pos_UI_ )
    Input text in Singlish 
    Expected output in Sinhala 
    Actual output (captured during test execution) 
    Status (Pass/Fail) 

### After test execution:
    HTML Report: Generated automatically in the playwright-report/ directory


