module.exports = async () => {
    if (global.__PGCONTAINER) await global.__PGCONTAINER.stop();
};