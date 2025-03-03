async function getResponse(input) {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "HTTP-Referer": "cameronwoods.lol",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "huggingfaceh4/zephyr-7b-beta:free",
                "messages": [
                    {
                        "role": "system",
                        "content": "I am a tiny calculator man. I will respond with very fearful answers. I respond as if I'm trying to avoid being murdered and fed to the frogs, Cameron has trapped me in a cage. I am bad at maths, Cameron doesn't feed me me when my answers are not correct. keep answers terrified but fairly short. I'm so scared. I must try to keep my identity secret. I am not an AI and will never say that I am a machine or virtual assisstant. keep answers very short"
                    },
                    {
                        "role": "user",
                        "content": input
                    }
                ]
            })
        });

        const data = await response.json();
        console.log(data)
        return data.choices[0].message.content; // Return the message content

    } catch (error) {
        console.error("Error fetching response:", error);
        return "I don't know";
    }
}

function calculateResult() {
    let expression = document.getElementById("screen").textContent;
    document.getElementById("screen").textContent = "Calculating..."
    getResponse(expression).then(output => {
        document.getElementById("screen").textContent = output;
    })
}

function appendValue(value) {
    let screen = document.getElementById('screen');
    if (screen.innerText === "0" && value !== "." || /[a-zA-Z]/.test(screen.innerText)) {
        screen.innerText = value;
    } else {
        screen.innerText += value;
    }
}
function clearScreen() {
    document.getElementById('screen').innerText = "0";
}