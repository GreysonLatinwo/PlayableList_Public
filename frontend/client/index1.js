import Web3 from 'web3';
import Playable from '../build/contracts/PlayableList.json';

let web3;
let playable;

const initWeb3 = () => {
    return new Promise((resolve, reject) => {
        if (typeof window.ethereum !== 'undefined') {
            const web3 = new Web3(window.ethereum);
            window.ethereum.enable()
                .then(() => {
                    resolve(
                        new Web3(window.ethereum)
                    );
                })
                .catch(e => {
                    reject(e);
                });
            return;
        }
        if (typeof window.web3 !== 'undefined') {
            return resolve(
                new Web3(window.web3.currentProvider)
            );
        }
        resolve(new Web3('http://localhost:9545'));
    });
};

const initContract = () => {
    const deploymentKey = Object.keys(Playable.networks)[0];
    return new web3.eth.Contract(
        Playable.abi,
        Playable
            .networks[deploymentKey]
            .address
    );
};

const initApp = () => {
    const $add = document.getElementById('add');
    //const $addResult = document.getElementById('add-result');
    //const $get = document.getElementById('get');
    //const $getResult = document.getElementById('get-result');
    const $getAll = document.getElementById('getAll');
    const $search = document.getElementById('search');
    //const $getAllResult = document.getElementById('get-results');
    //const $remove = document.getElementById('remove');
    //const $removeResult = document.getElementById('remove-result');
    const $playlist = document.getElementById('playlist');
    const $getEntryCost = document.getElementById('getEntryCostBtn');
    const $setEntryCost = document.getElementById('setEntryCostBtn');
    const $getVersion = document.getElementById('getVersion');

    let accounts = [];

    web3.eth.getAccounts()
        .then(_accounts => {
            accounts = _accounts;
        });

    $getVersion.addEventListener('click', (e) => {
        playable.methods.version().call()
            .then(result => {
                console.log(result)
            });
    });

    $getEntryCost.addEventListener('click', (e) => {
        const playlistID = document.getElementById('playlist-id').value;
        if (playlistID == '') {
            console.error('make sure that your in a playlist');
            PlaylistAddrText.classList.add("text-danger");
            PlaylistAddrText.innerText = "make sure that your in a playlist";
            return;
        } else {
            PlaylistAddrText.classList.remove("text-danger");
            PlaylistAddrText.innerText = "Playlist Address";
        }
        playable.methods.getEntryCost(playlistID).call()
            .then(result => {
                console.log(result)
            });
    });

    $setEntryCost.addEventListener('click', (e) => {
        const entryCost = document.getElementById('entry-cost').value;
        playable.methods.setEntryCost().call({ from: accounts[0], value: entryCost })
            .then(result => {
                $getEntryCost.click();
            });
    });

    //search
    $search.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchValue = e.target.elements[0].value.trim();
        const spotifyURL = ("https://api.spotify.com/v1/search?q=" + encodeURIComponent(searchValue) + "&type=track&limit=5");
        console.log(searchValue);
        console.log(spotifyURL);
        //spotify search code 
        $.ajax({
            url: spotifyURL,
            beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
            dataType: "json",
            success: function (data) {
                console.log(data.tracks.items);
                document.getElementById('search-results').innerHTML = ''
                for (var i = 0; i < data.tracks.items.length; i++) {
                    document.getElementById('search-results').innerHTML += `
            <li class="list-group-item bg-dark d-flex justify-content-between align-items-center">
              <img src='${data.tracks.items[i].album.images[2].url}' alt='Thumbnail' style="width:64px;height:64px;">
              <span id="add-song-name-${i}">${data.tracks.items[i].name} by ${data.tracks.items[i].artists[0].name}</span>
              <div>
                <div class="input-group">
                  <input id="songWeight${i}" type="number" placeholder="Energy" class="form-control"></input>
                  <div class="input-group-append">
                    <span class="input-group-text">wei</span>
                    <button id="add-button${i}" name="add" type="button" class="btn btn-primary">Add</button>
                  </div>
                </div>
              </div>
            </li>\n`;
                }
            }, error: function (err) {
                console.log("Error retrieving spotify API\n", err);
            }, complete: function (data) {
                var addButtons = document.getElementsByName("add");
                for (var i = 0; i < addButtons.length; i++) {
                    (function (idx) {
                        addButtons[idx].addEventListener('click', (e) => {
                            e.preventDefault();
                            const playlistID = document.getElementById('playlist-id').value;
                            const weight = document.getElementById('songWeight' + idx).value;
                            const PlaylistAddrText = document.getElementById("PlaylistAddrText");
                            if (playlistID == '') {
                                console.error('make sure that your in a playlist');
                                PlaylistAddrText.classList.add("text-danger");
                                PlaylistAddrText.innerText = "make sure that your in a playlist";
                                return;
                            } else {
                                PlaylistAddrText.classList.remove("text-danger");
                                PlaylistAddrText.innerText = "Playlist Address";
                            }
                            console.log("sending from: " + accounts[0])
                            document.getElementById('add-button' + idx).outerHTML = `<button id="add-button${idx}" name="add" type="button" class="btn btn-outline-warning"><span class="spinner-border spinner-border-sm"></span> Loading..</button>`
                            console.log(data.responseJSON['tracks']["items"][idx]);
                            let trackInfo = data.responseJSON['tracks']["items"][idx];
                            playable.methods.AddSong(trackInfo['album']['uri'],
                                trackInfo['album']['images'][0]['url'],
                                trackInfo['track_number'],
                                trackInfo['uri'],
                                trackInfo['name'],
                                trackInfo['artists'][0]['name'],
                                '', playlistID)
                                .send({ from: accounts[0], value: weight }).on("receipt", (receipt) => {
                                    document.getElementById('add-button' + idx).outerHTML = `<button id="add-button${idx}" name="add" type="button" class="btn btn-primary">Add</button>`
                                    $getAll.click();
                                }).catch(function (e) {
                                    var errortext = "Add";
                                    if (e.code == 4001)
                                        errortext = "Denied";
                                    else
                                        errortext = "Failed";
                                    document.getElementById('add-button' + idx).outerHTML = `<button id="add-button${idx}" name="add" type="button" class="btn btn-danger">${errortext}</button>`
                                    console.error(e);
                                });
                        });
                    })(i);
                }
            }
        });
    });
    // Get All Songs
    $getAll.addEventListener('click', (e) => {
        e.preventDefault();
        const playlistID = document.getElementById('playlist-id').value;
        if (playlistID == '') {
            console.error('make sure that your in a playlist');
            PlaylistAddrText.classList.add("text-danger");
            PlaylistAddrText.innerText = "make sure that your in a playlist";
            return;
        } else {
            PlaylistAddrText.classList.remove("text-danger");
            PlaylistAddrText.innerText = "Playlist Address";
        }
        $playlist.innerHTML = "";
        document.getElementById("currentSong").innerHTML = "";
        playable.methods.GetAll(playlistID).call()
            .then(result => {
                $playlist.innerHTML = "";
                document.getElementById("currentSong").innerHTML = "";
                //reset error messages
                $getAll.innerHTML = 'Get Songs';
                $getAll.classList.remove('btn-danger');
                $getAll.classList.add('btn-info');
                //get blockchain data
                var JSONResult = JSON.parse(result);
                console.log(JSONResult);
                if (JSONResult == 0)
                    $playlist.innerHTML = "No Songs in Playlist"
                //order by indexing power
                JSONResult.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
                //draw list
                for (var i = 0; i < JSONResult.length; i++) {
                    const putData = ``;
                    const spotifyURL = (`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(JSONResult[i]['trackURI'])}`);
                    const xmlhttp = new XMLHttpRequest();
                    xmlhttp.open("POST", spotifyURL, false);
                    xmlhttp.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken"));
                    //xmlhttp.send(putData)
                    if (i == 0) {
                        document.getElementById("currentSong").innerHTML =
                            `
            <div class="justify-content-center">
              <div class="mx-auto card bg-dark border border-primary rounded-lg">
                <img class="mx-auto card-img-top" src="${JSONResult[i]["albumImage"]}" alt="Current Song Thumbnail" style="max-width:400px">
                <div class="mx-auto card-body text-center justify-content-center">
                  <div class="d-flex d-inline-block">
                  <h4 class="mx-auto card-title">${JSONResult[i]["trackName"]}</h4>
                  <div>
                  </div></div>
                  <p class="mx-auto card-text">${JSONResult[i]["artist"]}</p>
                  <div class="btn-group">
                    <button id="pause-play" type="button" class="d-flex mx-auto btn btn-Primary">
                      <i class="fas fa-play"> Play</i>
                    </button>
                    <button id="Skip" type="button" class="d-flex mx-auto btn btn-Primary">
                      <i class="fas fa-forward"> Skip</i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            `
                        const playPause = document.getElementById("pause-play");
                        const skip = document.getElementById("Skip");
                        (function (idx) {
                            playPause.addEventListener('click', (e) => {
                                const putData = `{\"context_uri\":\"${JSONResult[idx]['albumURI']}\",\"offset\":{\"position\":${JSONResult[idx]['trackIndex'] - 1},\"position_ms\":0}}`;
                                let spotifyDeviceId = getCookie('device_id');
                                if (!spotifyDeviceId) {
                                    console.error("connect to spotify device");
                                    return;
                                }
                                const spotifyURL = (`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`);
                                const xmlhttp = new XMLHttpRequest();
                                xmlhttp.open("PUT", spotifyURL);
                                xmlhttp.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken"));
                                xmlhttp.send(putData);
                            });
                            skip.addEventListener('click', (e) => {
                                //skip on spotify
                                const putData = ``;
                                const spotifyURL = ("https://api.spotify.com/v1/me/player/next");
                                const xmlhttp = new XMLHttpRequest();
                                xmlhttp.open("POST", spotifyURL);
                                xmlhttp.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken"));
                                xmlhttp.send(putData);
                                //remove
                                playable.methods.Remove(playlistID, JSONResult[idx]['songID']).send({ from: accounts[0] })
                                    .on("receipt", (receipt) => {
                                        $getAll.click();
                                    })
                                    .catch(_e => {
                                        console.error(_e);
                                    });
                            });
                        })(i);
                    } else {
                        //const iframeElement = document.getElementById("playlist");
                        //$playlist.innerHTML = iframeElement;
                        //var windowList = iframeElement.contentWindow.document.getElementById("list")

                        $playlist.innerHTML +=
                            `
          <li class="list-group-item bg-dark d-flex justify-content-between align-items-center">
            <div class="d-inline-flex h-2 ">
            <h1>${i}</h1>
            <img src='${JSONResult[i]["albumImage"]}' alt='Thumbnail' style="width:64px;height:64px;">
            </div>
            <span>${JSONResult[i]["trackName"]} by ${JSONResult[i]["artist"]}</span>
            <div>
              <div class="input-group">
                <input id="songWeight${i}" type="number" placeholder="Energy" class="form-control"></input>
                <div>
                  <div class="input-group-append">
                    <button name="increase" id="increase"${i} type="button" class="btn btn-outline-Primary">Increase</button>
                    <span id="weight" class="input-group-text">${JSONResult[i]["weight"]} Wei</span>
                    <button name="remove" value="${JSONResult[i]["songID"]}" id="remove"${i} type="button" class="btn btn-danger close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          `
                    }
                }
            })
            .catch(_e => {
                $getAll.innerHTML = _e;
                $getAll.classList.remove('btn-info');
                $getAll.classList.add('btn-danger');
                console.error(_e);
            })
            .finally(() => {
                const playlistID = document.getElementById('playlist-id').value;
                const removeButtons = document.getElementsByName("remove");
                for (var i = 0; i < removeButtons.length; i++) {
                    (function (idx) {
                        var currButton = removeButtons[idx];
                        removeButtons[idx].addEventListener('click', (e) => {
                            e.preventDefault();
                            currButton.outerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
                            playable.methods.Remove(playlistID, currButton.value).send({ from: accounts[0] })
                                .on("receipt", (receipt) => {
                                    $getAll.click();
                                })
                                .catch(_e => {
                                    console.error(_e);
                                });
                        });
                    })(i);
                }
            });
    });
};

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

document.addEventListener('DOMContentLoaded', () => {
    let dependanciesLoaded = true;
    if (typeof window.ethereum == 'undefined') {
        console.error('Please Install metamask');
        const ethereumButton = document.querySelector('.enableEthereumButton');
        ethereumButton.style.visibility = "visible";
        ethereumButton.addEventListener('click', () => {
            var win = window.open('https://metamask.io/', '_blank');
            win.focus();
        });
        dependanciesLoaded = false;
    }

    if (dependanciesLoaded) {
        initWeb3()
            .then(_web3 => {
                web3 = _web3;
                playable = initContract();
                initApp();
                console.log(web3.fromWei(web3.eth.getBalance('0xA54B25a1EA558512DEF1adD7b2b301c16051C065')));
            })
            .catch((e) => {
                console.log(e.message);
                document.getElementById('enableEthereumButton').style.display = "initial";
            });

    }
});
