let cid = "";
let appVersion = "";
setVersion(window.electronApi).catch(e => console.error(e));

const links = document.querySelectorAll('a[my-link]');
links.forEach(link => {
    link.addEventListener("click", async function(event) {
        event.preventDefault();

        if (window.electronApi) {
            await window.electronApi.openExternal(this.getAttribute("my-link"));
        } else {
            window.open(this.getAttribute("my-link"), "_blank");
        }
        await sendLinkInfo(this.innerHTML)
    })
})

async function setVersion(electronApi) {
    if (!window.electronApi) return console.log("No electron :(");

    const versionSmall = document.getElementById("version");
    appVersion = await electronApi.getAppVersion();
    versionSmall.innerHTML = "Version " + appVersion;
    cid = await electronApi.getClientId();
    await sendLinkInfo("About");
}

async function sendLinkInfo(page) {
    if (!cid || !appVersion) return;

    const downloadServerUrl = "https://dl.controlx.io";  // "http://localhost:4862";
    const firewallCheckPath = downloadServerUrl + "/app/info";
    await fetch(firewallCheckPath + "?cat=" + page + "&act=open&lab=" + appVersion, {
        headers: { "cid": cid }
    })
}
