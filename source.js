async function getSourceCode(filepath) {
    const response = await fetch(filepath);
    if (!response.ok) {
        throw new Error(`Failed to fetch source code: ${response.statusText}`);
    }
    return await response.text();
}

async function getHTML(src, language) {
    const response = await fetch("cameronwoods.lol/proxy/http://hilite.me/api", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code: src,
            lexer: language,
            style: "colorful",
            linenos: "1",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch highlighted HTML: ${response.statusText}`);
    }
    
    return await response.text();
}

async function loadHTML(filepath, language) {
    document.querySelector("#code").innerHTML = `<p style="color: red;">Loading<br>Promise it works, just takes ages</p>`;
    try {
        const src = await getSourceCode(filepath);
        const html = await getHTML(src, language);
        //document.querySelector("#code").innerHTML = `<p style="color: red;">This doesn't work anymore sorry, am trying to fix</p>`;
        document.querySelector("#code").innerHTML = html;

    } catch (error) {
        console.error("Error loading and highlighting code:", error);
        document.querySelector("#code").innerHTML = `<p style="color: red;">Failed to load code.</p>`;
    }
}