import { BrowsingSession } from "./obj/BrowsingSession";

(async () => new BrowsingSession(
    { username: "", password: "" }, // login options
    { id: "capmonster", token: "" }, // captcha options
    true, // debug mode
))();