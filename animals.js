async function sendFrog() {
    const frogData = await getData("https://corsproxy.io/https://frogs.media/api/random");
    
    const image = document.querySelector("#image");
    image.innerHTML = `<img src="${frogData.url}" alt="frog name: ${frogData.name}" width='600' height='auto'/>`;
    const name = document.querySelector("#name");
    name.innerHTML = frogData.name;
}

async function sendCat() {
  const catData = await getData("https://api.thecatapi.com/v1/images/search");

  const image = document.querySelector("#image");
  const width = parseInt(catData[0].width) > 600 ? "600" : catData[0].width;
  const height = parseInt(catData[0].width) > 600 ? "auto" : catData[0].height;

  image.innerHTML = `<img src="${catData[0].url}" alt="random cat photo" width="${width}" height="${height}" />`;
  const name = document.querySelector("#name");
  name.innerHTML = "Random cat photo";
}

async function sendDog() {
  const dogData = await getData("https://random.dog/woof.json");

  const image = document.querySelector("#image");
  image.innerHTML = `<img src="${dogData.url}" alt="random dog photo" width='600' height='auto'/>`;
  const name = document.querySelector("#name");
  name.innerHTML = "Random dog photo";
}

async function getData(url){
    const response = await fetch(url);
    let data = await response.json();

    return data;
}