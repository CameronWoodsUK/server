async function getSourceCode(filepath) {
    const response = await fetch(filepath);
    if (!response.ok) {
        throw new Error(`Failed to fetch source code: ${response.statusText}`);
    }
    return await response.text();
}

async function getHTML(src) {
    const response = await fetch("https://test.cors.workers.dev/?http://hilite.me/api", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code: src,
            lexer: "rust",
            style: "colorful", // Optional
            linenos: "1",      // Optional
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch highlighted HTML: ${response.statusText}`);
    }
    return await response.text();
}

async function sendMainData() {
    getSourceCode("/src/main.rs").then(src => {
        return src;
    }).then(src => {
        getHTML(src).then(html => {
            const main = document.querySelector("#code");
            main.innerHTML = html;
        })
    })
}

async function sendLibData() {
    getSourceCode("/src/lib.rs").then(src => {
        return src;
    }).then(src => {
        getHTML(src).then(html => {
            const main = document.querySelector("#code");
            main.innerHTML = html;
        })
    })
}