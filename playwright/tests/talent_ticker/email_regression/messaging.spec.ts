import { test, expect } from '@playwright/test';
import Mailosaur from 'mailosaur';
const { assert } = require('chai');

require("dotenv").config();

// this is a convenience function to wait for a response.. feel free to use it anywhere
export const isFinished = async (response, url) => {
  return (
    response.url().includes(url) &&
    response.status() === 200 &&
    (await response.json()).response === "Completed"
  );
};

function Name_Alpha_Numeric() {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

const randomName = Name_Alpha_Numeric();

test.use({ storageState: "tests/state.json" });
test.setTimeout(120000);


test("Contact Messaging From Sourcing Using Outlook Integration", async ({
  page,
}) => {
  const serverId = process.env.MAILOSAUR_SERVER as string;
  const apiKey = process.env.MAILOSAUR_API_KEY as string;
  const mailosaur = new Mailosaur(apiKey);


  await page.goto(process.env.BASE_URL + "home");

  await expect(page).toHaveURL(process.env.BASE_URL + "home");

  // Click #profileImgWrap
  await page.click("#profileImgWrap");
  
  // Click text=Sign out
  await page.click("text=Sign out");

  await expect(page).toHaveURL(process.env.BASE_URL);

  // Click text=Log In
  await page.click("text=Log In");
  await expect(page).toHaveURL(new RegExp("https://auth.talentticker.ai"));
  expect(await page.innerText("h1")).toBe("Welcome to Talent Ticker");
  expect(await page.innerText('[class="message"]')).toBe(
    "Please log in to continue."
  );
  // Fill [placeholder="Your\ email"]
  await page.fill('input[type="email"]', process.env.EMAIL_USERNAME as string);
  // Fill [placeholder="Your\ password"]
  await page.fill('input[type="password"]', process.env.EMAIL_PASSWORD as string);
  // Click button:has-text("Log In")
  await Promise.all([
    page.waitForNavigation(/*{ url: process.env.BASE_URL + 'home' }*/),
    page.click('button:has-text("Log In")')
  ]);

  await expect(page).toHaveURL(process.env.BASE_URL + "home");

  // Nav to Talent Sourcing
  await page.click('[data-test="talentSourcingNavButton"]');
  await expect(page).toHaveURL(process.env.BASE_URL + "sourcing");

  // Fill [placeholder="e\.g\.\ Digital\ Designer"]
  await page.fill(
    '[placeholder="e\\.g\\.\\ Digital\\ Designer"]',
    "test account"
  );
  // Click text=test account
  await page.click("text=test account");
  // Fill [placeholder="e\.g\.\ Monzo\ Bank"]
  await page.fill('[placeholder="e\\.g\\.\\ Monzo\\ Bank"]', "selligence");
  // Click li[role="option"]:has-text("Selligence")
  await page.click('li[role="option"]:has-text("Selligence")');
  // Click [data-testid="search-btn"]
  await page.click('[data-testid="search-btn"]');
  // Check input[type="checkbox"]
  await page.check('input[type="checkbox"]');
  // Click text=emailMessage (1)
  await page.click("text=emailMessage (1)");

  // we need to wait for the code to initialize in the background.. its using a state machine that does some shit. 
  // basically artifical wait. 5 seconds is prob too much but to be safe..
  // 2 clicks as they are always flake
  page.click('button:has-text("Next")', { delay: 5000, clickCount: 2 });
  // need to wait here  for the get_accounts request.. this test has exposed shitty frontend code
  // Click [data-testid="template-select-dropdown"] div[role="button"]:has-text("​")
  await page.click(
    '[data-testid="template-select-dropdown"] div[role="button"]:has-text("​")'
  );
  // Click (li[role="option"]:has-text("Test"))
  await page.click('li[role="option"]:has-text("Test")');

  // Fill [aria-label="subject"]
  await page.fill('[aria-label="subject"]', randomName);
  // Click text=Send Message
  await page.click("text=Send Message");
  // Click button:has-text("close")
  await page.click('button:has-text("close")');

  await page.click('[data-test="pageTemplate"] >> text=Clear All');

  await page.click('[data-test="contatcsNavButton"]');
  await expect(page).toHaveURL(process.env.BASE_URL + "outbox");

  expect(await page.innerText("h1")).toContain("Outbox");

  let i = 0;
  let mailFound = false;
  while (i < 10) {
    if (mailFound == false) {
      try {
        await expect(
          page.locator(':nth-match(span[class="subject"], 1)')
        ).toContainText(randomName);
        mailFound = true;
      } catch (e) {
        i++;
        await page.click('[data-testid="reload-list-btn"]');
        if (i == 10) {
          throw e;
        }
      }
    } else {
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
    sentTo: process.env.TEST_EMAIL,
  });

  let a = 0;
  let mailosaurFound = false;
  while (a < 10) {
    if (mailosaurFound == false) {
      try {
        assert.equal(email.subject, randomName);
        mailosaurFound = true;
      } catch (e) {
        a++;
        await page.reload();
        if (a == 10) {
          throw e;
        }
      }
    } else {
      break;
    }
  }

  const firstLink = email.html.links[0]

  await page.goto(firstLink.href);

  await expect(page).toHaveURL(new RegExp("https://staging.talentticker.ai/message-unsubscribe?"));

  expect(await page.innerText('h1')).toContain("Selligence");
  expect(await page.innerText('h2')).toContain("Please confirm that you want to unsubscribe");
});