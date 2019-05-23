import { AppPage } from "./app.po";
import { browser, logging, ExpectedConditions, element, by } from "protractor";

describe("workspace-project App", () => {
	let page: AppPage;

	beforeAll(async ()  => {
    });

	beforeEach(async () => {
		page = new AppPage();

		await page.navigateTo();
		
		browser.sleep(5000);
    	browser.ignoreSynchronization = true;
		await browser.wait(ExpectedConditions.presenceOf(element(by.css(".game"))), 30000, 'element is not present');	
	});

	it("should display a challenge", async () => {
		expect(page.getChallenge()).toContain("=");
	});

	it("should display score on avatar", async () => {
		expect(page.getAvatarScore()).toBeTruthy();
	});

	it("should display score on player list", async () => {
		expect(page.getYourScore()).toBeTruthy();
	});

	afterEach(async () => {
		// Assert that there are no errors emitted from the browser
		const logs = await browser.manage().logs().get(logging.Type.BROWSER);
		expect(logs).not.toContain(jasmine.objectContaining({
			level: logging.Level.SEVERE,
		} as logging.Entry));
	});
});
