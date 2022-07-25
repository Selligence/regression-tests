import { test, expect } from '@playwright/test';
import Mailosaur from 'mailosaur';
const assert = require('chai').assert;
require('dotenv').config();

test.use({ storageState: 'tests/state.json' });

test("Contact Messaging From Vacancy Using Outlook Integration", async ({ page }) => {
  test.setTimeout(120000);

  function Name_Alpha_Numeric() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  const apiKey = process.env.MAILOSAUR_API_KEY;
  const mailosaur = new Mailosaur(apiKey);

  const serverId = process.env.MAILOSAUR_SERVER;

  await page.goto(process.env.BASE_URL + "home");

  await expect(page).toHaveURL(process.env.BASE_URL + 'home');

  // Click #profileImgWrap
  await page.click('#profileImgWrap');
  
  // Click text=Sign out
  await page.click("text=Sign out");

  await expect(page).toHaveURL(process.env.BASE_URL);

  // Click text=Log In
  await page.click('text=Log In');
  await expect(page).toHaveURL(new RegExp('https://auth.talentticker.ai'));
  expect(await page.innerText('h1')).toBe("Welcome to Talent Ticker");
  expect(await page.innerText('[class="message"]')).toBe("Please log in to continue.");
  // Fill [placeholder="Your\ email"]
  await page.fill('input[type="email"]', process.env.EMAIL_USERNAME);
  // Fill [placeholder="Your\ password"]
  await page.fill('input[type="password"]', process.env.EMAIL_PASSWORD);
  // Click button:has-text("Log In")
  await Promise.all([
    page.waitForNavigation(/*{ url: process.env.BASE_URL + 'home' }*/),
    page.click('button:has-text("Log In")')
  ]);

  await expect(page).toHaveURL(process.env.BASE_URL + 'home');

  // Click [data-test="vacanciesNavButton"]
  await page.click('[data-test="vacanciesNavButton"]');
  await expect(page).toHaveURL(process.env.BASE_URL + 'vacancies');
  
  // Click [placeholder="Search"]
  await page.click('[placeholder="Search"]');
  // Click div[role="listbox"] >> text=Saved
  await page.click('div[role="listbox"] >> text=Saved');
  // Click [placeholder="Search"]
  await page.click('[placeholder="Search"]');
  // Click [data-test="pageTemplate"] >> text=Selligence
  await page.click('[data-test="pageTemplate"] >> text=Selligence');
  await expect(page).toHaveURL(process.env.BASE_URL + 'news');
  // Click [data-test="vacanciesTabButton"] >> text=Vacancies
  await page.click('[data-test="vacanciesTabButton"] >> text=Vacancies');
  await expect(page).toHaveURL(process.env.BASE_URL + 'vacancies');

  expect(await page.innerText('strong')).toContain("Selligence");

  // Click [data-testid="placed-event-title"]
  await page.locator(':nth-match(h5[data-testid="placed-event-title"], 1)').click();

  // Click [data-testid="contacts-section"] >> text=Clear all
  await page.click('[data-testid="contacts-section"] >> text=Clear all');

  // Fill [placeholder="Search\ by\ name\,\ role\ or\ location"]
  await page.fill('[placeholder="Search\\ by\\ name\\,\\ role\\ or\\ location"]', 'Test Account Manager');
  // Click text=“Tom Jones”
  await page.click('text=“Test Account Manager”');
  // Check input[type="checkbox"]
  await page.check('input[type="checkbox"]');
  // Click text=emailMessage (1)
  await page.click('text=emailMessage (1)');

  // we need to wait for the code to initialize in the background.. its using a state machine that does some shit. 
  // basically artifical wait. 5 seconds is prob too much but to be safe..
  // 2 clicks as they are always flake
  page.click('button:has-text("Next")', { delay: 5000, clickCount: 2 });
  // need to wait here  for the get_accounts request.. this test has exposed shitty frontend code
  // Click [data-testid="template-select-dropdown"] div[role="button"]:has-text("​")
  await page.click(
    '[data-testid="template-select-dropdown"] div[role="button"]:has-text("​")'
  );
  // Click :nth-match(li[role="option"]:has-text("Test"), 2)
  await page.click('li[role="option"]:has-text("Test")');

  const randomName = Name_Alpha_Numeric();
  // Fill [aria-label="subject"]
  await page.fill('[aria-label="subject"]', randomName);
  // Click text=Send Message
  await page.click('text=Send Message');

  await expect(
    page.locator('[data-testid="message-send-success"]')
  ).toContainText("Message successfully sent");

  // Click button:has-text("close")
  await page.click('[data-testid="close-drawer-button"]');

  await page.click('[aria-label="Close"]');
  
  // Click [data-test="contatcsNavButton"]
  await page.click('[data-test="contatcsNavButton"]');
  await expect(page).toHaveURL(process.env.BASE_URL + 'outbox');

  expect(await page.innerText('h1')).toContain("Outbox");

  await page.click('[data-test="contatcsNavButton"]');
  await expect(page).toHaveURL(process.env.BASE_URL + 'outbox');

  expect(await page.innerText('h1')).toContain("Outbox");

  let i = 0;
  let mailFound = false;
  while (i < 10) {
    if (mailFound == false){
      try {        
          await expect(page.locator(':nth-match(span[class="subject"], 1)')).toContainText(randomName);
          mailFound = true;
      } catch (e) {
          i++;
          await page.click('[data-testid="reload-list-btn"]');
          if (i == 10){
            throw e
          }
      }
    }
    else {
      break;
    } 
  }

  // Sign Out
  await page.click("#profileImgWrap");
  await Promise.all([
    page.waitForNavigation(/*{ url: process.env.BASE_URL }*/),
    page.click("text=Sign out"),
  ]);

  // Search for the email in Mailosaur (Looped to slow this down in case the outbox is so fast that the Mailosaur check happens instantly) 
  const email = await mailosaur.messages.get(serverId, {
    sentTo: process.env.TEST_EMAIL
  });

  let a = 0;
  let mailosaurFound = false;
  while (a < 10) {
    if (mailosaurFound == false){
      try {        
        assert.equal(email.subject, randomName);
          mailosaurFound = true;
      } catch (e) {
          a++;
          await page.click('[data-testid="reload-list-btn"]');
          if (a == 10){
            throw e
          }
      }
    }
    else {
      break;
    } 
  }

  });
  