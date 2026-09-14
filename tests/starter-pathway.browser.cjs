const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const origin = process.env.GO_LAB_URL || 'http://127.0.0.1:3100';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>{ errors.push(e.message); console.log('PAGE ERROR',e.message); });
 await page.goto(origin + '/education',{waitUntil:'domcontentloaded',timeout:120000});
 const consent=page.getByRole('button',{name:'Reject All',exact:true});
 if (await consent.isVisible()) await consent.click();
 await page.getByRole('link',{name:'Open Starter Pathway',exact:true}).click();
 const start=page.getByRole('button',{name:'Begin the journey',exact:true});
 await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'Begin the journey'); return b && !b.disabled; }); await start.focus();await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'Step 1 — Notice',exact:true}).waitFor();
 assert.equal(await page.locator('#starter-evidence').getAttribute('required'), null);
 await page.locator('#starter-evidence').fill('Choose a card, move a token, score a point.');
 await page.locator('#starter-reflection').fill('Choosing a card starts the loop.');
 await page.getByRole('button',{name:'Mark this step complete',exact:true}).click();
 await page.getByText(/Saved for this visit only/).waitFor();
 assert.ok((await page.locator('.starter-pathway').innerText()).includes('50 XP awarded'));
 await page.getByRole('button',{name:'2. Imagine',exact:false}).click();
 await page.getByRole('button',{name:'1. Notice',exact:false}).click();
 await expect(page.locator('#starter-evidence')).toHaveValue('Choose a card, move a token, score a point.');
 await expect(page.locator('#starter-reflection')).toHaveValue('Choosing a card starts the loop.');
 await page.getByRole('button',{name:'Confirm completion (no extra XP)',exact:true}).click();
 await page.getByText(/0 XP awarded/).waitFor();
 await page.screenshot({path:'tmp/starter-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Next step: Imagine'}).click();
 await page.getByText('This step is included with GO Community.',{exact:false}).waitFor();
 await page.reload();
 await page.getByText('0 of 6 steps complete',{exact:false}).waitFor();
 const catalog=await(await page.request.get(origin + '/api/learning-catalog')).json();assert.equal(catalog.lessons.length,6);
 await page.setViewportSize({width:1440,height:1000});await start.click();
 await page.screenshot({path:'tmp/starter-desktop.png',fullPage:true});
 await page.goto(origin + '/learn',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.starter-pathway').count(), 0);
 await page.goto(origin + '/education/starter-pathway');
 await page.getByRole('button',{name:'Begin the journey',exact:true}).click();
 await page.getByRole('button',{name:'Mark this step complete',exact:true}).click();
 await page.getByText(/50 XP awarded/).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS keyboard start, Notice completion, duplicate XP, anonymous reload, membership lock, mobile overflow, catalog, desktop render; no browser errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



