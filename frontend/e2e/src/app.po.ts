import { browser, by, element } from "protractor";

export class AppPage {
	navigateTo() {
		return browser.get(browser.baseUrl) as Promise<any>;
	}

	getChallenge() {
		return element(by.css(".game .challenge p")).getText() as Promise<string>;
	}
}
