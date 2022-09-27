import { Browser, Page } from "puppeteer";
import { BuiltinSolutionProviders, default as RecaptchaPlugin } from "puppeteer-extra-plugin-recaptcha";

import { default as CapMonsterProvider } from "puppeteer-extra-plugin-recaptcha-capmonster";
import { default as extra } from "puppeteer-extra";
import { SolveRecaptchasResult } from "puppeteer-extra-plugin-recaptcha/dist/types";
import { Validate } from "../namespaces/Validate";
import { Strings } from "../namespaces/Strings";

const basicLogFormat: string = "[BrowsingSession-{0}] [{1}] [{2}] {3}";

const log = (message: string, from: string, level?: "info" | "warn" | "error") => {
    switch (level) {
        case "warn":
            console.warn(Strings.format(basicLogFormat, "WARN", new Date().toLocaleTimeString(), from, message));
            break;
        case "error":
            console.error(Strings.format(basicLogFormat, "ERROR", new Date().toLocaleTimeString(), from, message));
            break;
        default:
            console.log(Strings.format(basicLogFormat, "LOG", new Date().toLocaleTimeString(), from, message));
    }
};

type CaptchaProvider = "capmonster" | "2captcha";

interface CaptchaOptions {
    id: CaptchaProvider;
    token: string;
    visualFeedback?: boolean;
}

interface LoginOptions {
    username: string;
    password: string;
}

type LoginResults =
    "LOGIN_SUCCESS" |
    "USERNAME_FIELD_RELATED" |
    "PASSWORD_FIELD_RELATED" |
    "CAPTCHA_FIELD_RELATED" |
    "INVALID_CREDENTIALS" |
    "PAGE_OTHER_ERROR";

CapMonsterProvider.use(BuiltinSolutionProviders);

/**
 * This class represents a browsing session. It is used to store the current
 * browsing session that will automate crypto tasks on the website AutoFaucet.
 * 
 * @author spook
 * @class BrowsingSession
 * @param {LoginOptions} loginOptions The login options for the browsing session.
 * @param {CaptchaOptions} captchaOptions The captcha options for the browsing session.
 * @param {boolean} debugMode The debug mode for the browsing session.
 */

export class BrowsingSession {

    private loginOptions: LoginOptions;
    private session: Browser | null;
    private page: Page | null;
    private captchaOptions: CaptchaOptions | null;
    private debug: boolean;

    public constructor(login: LoginOptions, captcha?: CaptchaOptions, debug?: boolean) {

        // Set fields to default values
        this.loginOptions = login;
        this.session = null;
        this.page = null;
        this.captchaOptions = captcha || null;
        this.debug = debug || false;

        // Must be called before any other puppeteer-extra usage
        if (this.captchaOptions) {

            // Validate captcha options
            if (!Validate.nonNullEmpty(this.captchaOptions.id, this.captchaOptions.token)) {
                log("Invalid captcha options provided", "CaptchaSolver", "error");
                return;
            }

            extra.use(
                RecaptchaPlugin({
                    provider: {
                        id: this.captchaOptions.id,
                        token: this.captchaOptions.token
                    },
                    visualFeedback: this.captchaOptions.visualFeedback || false,
                })
            );
            log("Captcha options set, continuing to validate login options", "CaptchaSolver", "info");
        }

        // Validate login options, at-least the username and password must be specified
        if (!Validate.nonNullEmpty(this.loginOptions.username, this.loginOptions.password)) {
            log("Invalid login options provided", "Login", "error");
            return;
        }

        log("Login options set, continuing to run browsing session", "Login", "info");
        this.run();
    }

    /**
     * Starts the browsing session, which will automatically login and start the faucet.
     */

    public async run(): Promise<void> {

        log("Starting browsing session", "BrowsingSession", "info");

        this.session = await extra.launch({ headless: !this.debug });

        log("Session started, continuing to open page", "BrowsingSession", "info");

        this.page = await this.session.newPage();

        await this.page.goto("https://autofaucet.org/dashboard")
            .then(async () =>
                await this.login()
                    .then(async (result: LoginResults) => log("Result for login attempt: " + result, "Login", "info"))
                    .catch(err => log(err, "Login", "error"))
            ).catch((err) => log(err, "Page", "error"));

    }

    /**
     * Attempts to login to the website and returns the result
     * @returns {Promise<LoginResults>}
     */

    private async login(): Promise<LoginResults> {
        return new Promise(async (resolve, reject) => {
            await this.page?.waitForNavigation({ waitUntil: "networkidle0" }).then(async () => {

                // Type in username or reject if failed
                await this.page?.click("input[name=username]")
                    .then(async () => await this.page?.type("input[name=username]", this.loginOptions.username))
                    .catch((_) => reject("USERNAME_FIELD_RELATED"));

                // Type in password or reject if failed
                await this.page?.click("input[name=password]")
                    .then(async () => await this.page?.type("input[name=password]", this.loginOptions.password))
                    .catch((_) => reject("PASSWORD_FIELD_RELATED"));

                // Solve captchas if they exist
                await this.solveCaptchas(this.page, this.captchaOptions)
                    .then(async (resolve: SolveRecaptchasResult | undefined) => {

                        if (typeof resolve === "undefined") reject("Failed to solve captcha");

                        log("Successfully solved captcha! (Provider: " + this.captchaOptions?.id + ")", "CaptchaSolver", "info");
                        await Promise.all([this.page?.waitForNavigation(), this.page?.click("button[type=submit]")]);
                    }).catch((_) => reject("CAPTCHA_FIELD_RELATED"));

                if (this.page?.url() === "https://autofaucet.org/dashboard") resolve("LOGIN_SUCCESS");

                reject("INVALID_CREDENTIALS"); // Captchas are always provided, so if the login failed, the credentials are invalid at-least I think


            }).catch((_) => reject("PAGE_OTHER_ERROR"));
        });
    }

    /**
     * Attempts to solve captchas on the page.
     * @param page The page to solve captchas on
     * @param captchaOptions The captcha options to use
     * @returns {Promise<SolveRecaptchasResult | undefined>} The result of the captcha solving
     */

    private async solveCaptchas(page: Page | null, captchaOptions: CaptchaOptions | null): Promise<SolveRecaptchasResult | undefined> {

        let result: SolveRecaptchasResult | undefined = undefined;

        if (captchaOptions) {
            switch (captchaOptions.id) {
                case "capmonster":
                    log("Solving captcha with CapMonster", "CaptchaSolver", "info");
                    await page?.solveRecaptchas().then(res => result = res).catch(err => log(err, "CaptchaSolver", "error"));
                    break;
                case "2captcha":
                    // TODO: Implement 2captcha
                    break;
                default:
                    log("Invalid captcha provider specified", "CaptchaSolver", "error");
                    break;
            }
        }

        return result;
    }

}
