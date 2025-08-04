async function sendRandFrog() {
    const image = document.querySelector("#randomImage");
    image.innerHTML = `<span class="loader"></span>`;

    const frogData = await getData("https://corsproxy.io/https://frogs.media/api/random");
    image.innerHTML = `<img class="animalPhoto" src="${frogData.url}" alt="${frogData.name} is not available :( maybe try again" />`;
    const name = document.querySelector("#randomName");
    name.innerHTML = frogData.name;
}

async function sendRandCat() {
  const image = document.querySelector("#randomImage");
  image.innerHTML = `<span class="loader"></span>`;

  const catData = await getData("https://api.thecatapi.com/v1/images/search");
  const width = parseInt(catData[0].width) > 600 ? "600" : catData[0].width;
  const height = parseInt(catData[0].width) > 600 ? "auto" : catData[0].height;

  image.innerHTML = `<img class="animalPhoto" src="${catData[0].url}" alt="this cat isn't available right now :( purrhaps try again" />`;
  const name = document.querySelector("#randomName");
  name.innerHTML = "Random cat photo";
}

async function sendRandDog() {
  const image = document.querySelector("#randomImage");
  const name = document.querySelector("#randomName");
  image.innerHTML = `<span class="loader"></span>`;

  const dogData = await getData("https://random.dog/woof.json");
  const url = dogData.url;
  if (! url.includes(".mp4")) {
    image.innerHTML = `<img class="animalPhoto" src="${url}" alt="this dog is out on a walk right now, try the button again" />`;
    name.innerHTML = "Random dog photo";
  } else {
    image.innerHTML = `<video controls="" autoplay="" preload="metadata" class="dogVid"><source src="${url}" type="video/mp4">This dog video wont work for some reason</video>`;
    name.innerHTML = "Random dog video";
  }
}

async function getData(url){
    const response = await fetch(url);
    let data = await response.json();

    return data;
}