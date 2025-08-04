async function getResource(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }
    return await response.text();
}

function include(name) {
    getResource("/" + name + ".html").then(content => {
        const doc = document.querySelector("#" + name);
        doc.innerHTML += content;
    })
}

function copyEmail(event) {
    event.preventDefault();
    const email = "woodscameron79@gmail.com";
    navigator.clipboard.writeText(email).then(() => {
        const tooltip = document.getElementById("copy-tooltip");
        tooltip.classList.add("show-tooltip");
        setTimeout(() => tooltip.classList.remove("show-tooltip"), 1500);
    });
}

include("head")
include("header")
include("footer")