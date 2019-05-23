import { browser, by, element } from "protractor";

export class AppPage {
	navigateTo() {
		return browser.get(browser.baseUrl) as Promise<any>;
	}

	getChallenge() {
		return element(by.css(".game .challenge p")).getText() as Promise<string>;
	}

	getAvatarScore() {
		return element(by.css(".profile-avatar .score")).getText() as Promise<string>;
	}

	getYourScore() {
		return element(by.css(".orange .score")).getText() as Promise<string>;
	}
}
