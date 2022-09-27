import { Browser, Page } from "puppeteer";

type ProcessorType = "short_url" | "offer_walls";

export interface IProcessor {
    url: string;
    enabled?: boolean;
    type: ProcessorType;
    process: (session: Browser, page: Page) => Promise<boolean>;
}