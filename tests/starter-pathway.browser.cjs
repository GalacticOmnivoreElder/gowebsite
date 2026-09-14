const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const origin = process.env.GO_LAB_URL || 'http://127.0.0.1:3100';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>{ errors.push(e.message); console.log('PAGE ERROR',e.message); });
 await page.goto(origin + '/learn',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('button',{name:'Reject All',exact:true}).click();
 const start=page.getByRole('button',{name:'Start Starter Pathway',exact:true});
 await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'Start Starter Pathway'); return b && !b.disabled; }); await start.focus();await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'World 1 — Notice',exact:true}).waitFor();
 await page.getByRole('button',{name:'Complete mission',exact:true}).click();
 assert.equal(await page.locator('#starter-evidence').evaluate(el => el.validity.valueMissing), true);
 await page.locator('#starter-evidence').fill('Choose a card, move a token, score a point.');
 await page.locator('#starter-reflection').fill('Choosing a card starts the loop.');
 await page.getByRole('button',{name:'Complete mission',exact:true}).click();
 await page.getByText(/Saved for this visit only/).waitFor();
 assert.ok((await page.locator('.starter-pathway').innerText()).includes('50 XP awarded'));
 await page.getByRole('button',{name:'2. Imagine',exact:false}).click();
 await page.getByRole('button',{name:'1. Notice',exact:false}).click();
 assert.equal(await page.locator('#starter-evidence').inputValue(), 'Choose a card, move a token, score a point.');
 assert.equal(await page.locator('#starter-reflection').inputValue(), 'Choosing a card starts the loop.');
 await page.getByRole('button',{name:'Confirm completion (no extra XP)',exact:true}).click();
 await page.getByText(/0 XP awarded/).waitFor();
 await page.screenshot({path:'tmp/starter-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Next world: Imagine'}).click();
 await page.getByText('This world is included with GO Community.',{exact:false}).waitFor();
 await page.reload();
 await page.getByText('0 of 6 worlds complete',{exact:false}).waitFor();
 const catalog=await(await page.request.get(origin + '/api/learning-catalog')).json();assert.equal(catalog.lessons.length,6);
 await page.setViewportSize({width:1440,height:1000});await start.click();
 await page.screenshot({path:'tmp/starter-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS keyboard start, Notice completion, duplicate XP, anonymous reload, membership lock, mobile overflow, catalog, desktop render; no browser errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



