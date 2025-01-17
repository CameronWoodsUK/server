async function sendRandFrog() {
    const frogData = await getData("https://corsproxy.io/https://frogs.media/api/random");
    
    const image = document.querySelector("#randomImage");
    image.innerHTML = `<img class="animalPhoto" src="${frogData.url}" alt="${frogData.name} is not available :( maybe try again" />`;
    const name = document.querySelector("#randomName");
    name.innerHTML = frogData.name;
}

async function sendRandCat() {
  const catData = await getData("https://api.thecatapi.com/v1/images/search");

  const image = document.querySelector("#randomImage");
  const width = parseInt(catData[0].width) > 600 ? "600" : catData[0].width;
  const height = parseInt(catData[0].width) > 600 ? "auto" : catData[0].height;

  image.innerHTML = `<img class="animalPhoto" src="${catData[0].url}" alt="this cat isn't available right now :( purrhaps try again" />`;
  const name = document.querySelector("#randomName");
  name.innerHTML = "Random cat photo";
}

async function sendRandDog() {
  const dogData = await getData("https://random.dog/woof.json");

  const image = document.querySelector("#randomImage");
  image.innerHTML = `<img class="animalPhoto" src="${dogData.url}" alt="this dog is out on a walk right now, try the button again" />`;
  const name = document.querySelector("#randomName");
  name.innerHTML = "Random dog photo";
}

async function getData(url){
    const response = await fetch(url);
    let data = await response.json();

    return data;
}