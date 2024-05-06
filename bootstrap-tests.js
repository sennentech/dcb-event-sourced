require("ts-node/register")
require("source-map-support").install()

;(async () => {
    try {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised);
        global.expect = chai.expect;
    } catch (error) {
        console.error("Failed to load chai modules:", error);
        process.exit(1);
    }
})();