import { Browser, Page } from "puppeteer";
import { IProcessor } from "../interfaces/IProcessor";

export const GenericShortLink: IProcessor = {
    url: "https://www.google.com",
    enabled: true,
    type: "short_url",
    process: async (session: Browser, page: Page): Promise<boolean> => {
        // TODO Implement this
        return true;
    }
}