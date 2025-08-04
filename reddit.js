async function fetchRedditPosts(subreddit, time = "day", limit = 10) {
    const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${time}&limit=${limit}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extract relevant post information
        return data.data.children.map(post => ({
            title: post.data.title,
            url: post.data.url,
            score: post.data.score,
            author: post.data.author,
        }));
    } catch (error) {
        console.error(`Error fetching data for /r/${subreddit}:`, error);
        return [];
    }
}
  
function isImgUrl(url) {
    const img = new Image();
    img.src = url;
    return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
    });
}

async function getFirstImage(sub) {
    const posts = await fetchRedditPosts(sub);
  
    for (const post of posts) {
        const isImage = await isImgUrl(post.url);
        if (isImage) {
            return post;
        }
    }
  
    return null; // Return null if no valid image is found
}

async function sendRedditPost(sub) {
    const image = document.querySelector("#redditImage");
    image.innerHTML = `<span class="loader"></span>`;

    const data = await getFirstImage(sub);
    image.innerHTML = `<a href="${data.url}"/ target="_blank"><img class="animalPhoto" src="${data.url}" alt="Image not available right now :("/><a/>`;
    const name = document.querySelector("#redditName");
    name.innerHTML = data.title;
}