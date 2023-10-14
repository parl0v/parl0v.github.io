const audioPlayer = document.getElementById("audioPlayer");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const volumeControl = document.getElementById("volumeControl");
const progressSlider = document.getElementById("progressSlider");
const timeDisplay = document.getElementById("timeDisplay");

function playSong(songSrc) {
    audioPlayer.src = songSrc;
}

function updateProgressBar() {
    const duration = audioPlayer.duration;
    const currentTime = audioPlayer.currentTime;
    progressSlider.value = currentTime;
    progressSlider.max = duration;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.floor(duration % 60);
    timeDisplay.textContent = `${minutes}:${(seconds < 10 ? '0' : '')}${seconds} / ${durationMinutes}:${(durationSeconds < 10 ? '0' : '')}${durationSeconds}`;
}

audioPlayer.addEventListener("timeupdate", updateProgressBar);
audioPlayer.addEventListener("ended", () => {
    timeDisplay.textContent = "0:00 / 0:00";
});

audioPlayer.addEventListener("loadedmetadata", () => {
    updateProgressBar();
});

const songList = document.querySelectorAll("#songList li");
songList.forEach((song) => {
    song.addEventListener("click", () => {
        playSong(song.getAttribute("data-song"));
    });
});

playButton.addEventListener("click", () => {
    audioPlayer.play();
});

pauseButton.addEventListener("click", () => {
    audioPlayer.pause();
});

volumeControl.addEventListener("input", () => {
    audioPlayer.volume = volumeControl.value;
});

progressSlider.addEventListener("input", () => {
    audioPlayer.currentTime = progressSlider.value;
});

function update(name) {
    currentlyPlaying = document.getElementById("currentlyPlaying");
    currentlyPlaying.innerText = "Trenutno svira: " + name;
}