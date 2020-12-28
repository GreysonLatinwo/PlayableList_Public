import Web3 from 'web3'

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
  //const $add = document.getElementById('add');
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

  let accounts = [];

  web3.eth.getAccounts()
    .then(_accounts => {
      accounts = _accounts;
    });
/*
  document.getElementById('getVersion').addEventListener('click', (e) => {
    playable.methods.version().call()
      .then(result => {
        console.log(result)
      });
  });
*/

  //constract event listeners
  playable.events.playlistAltered()
    .on('data', function (event) {
      console.log(event); // same results as the optional callback above
      var playlistID = document.getElementById('playlist-id').value;
      if (event.returnValues.playlistID == playlistID)
        $getAll.click();
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
        console.log(accounts[0], result)
      });
  });

  $setEntryCost.addEventListener('click', (e) => {
    const entryCost = document.getElementById('entry-cost').value;

    playable.methods.setEntryCost().send({ from: accounts[0], value: entryCost })
      .on("receipt", (receipt) => {
        console.log(receipt)
        $getEntryCost.click();
      });
  });

  //search
  $search.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchValue = e.target.elements[0].value.trim();
    var searchLimit = e.target.elements[1].value;
    if(searchLimit == "")
      searchLimit = 5
    const spotifyURL = ("https://api.spotify.com/v1/search?q=" + encodeURIComponent(searchValue) + "&type=track&limit=" + searchLimit);
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
          document.getElementById('search-results').innerHTML += 
          `
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
            </li>\n
          `;
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
              //document.getElementById('add-button' + idx).outerHTML = `<button id="add-button${idx}" name="add" type="button" class="btn btn-outline-warning"><span class="spinner-border spinner-border-sm"></span> Loading..</button>`
              document.getElementById('add-button' + idx).innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading..'
              document.getElementById('add-button' + idx).classList.remove('btn-primary')
              document.getElementById('add-button' + idx).classList.add('btn-outline-warning')
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
                  document.getElementById('add-button' + idx).innerHTML = 'Add'
                  document.getElementById('add-button' + idx).classList.remove('btn-outline-warning')
                  document.getElementById('add-button' + idx).classList.add('btn-primary')
                  $getAll.click();
                }).catch(function (e) {
                  var errortext = "Add";
                  if (e.code == 4001)
                    errortext = "Denied";
                  else
                    errortext = "Failed";
                  document.getElementById('add-button' + idx).innerHTML = errortext
                  document.getElementById('add-button' + idx).classList.remove('btn-outline-warning')
                  document.getElementById('add-button' + idx).classList.add('btn-danger')
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
        document.getElementById("currentSong").innerHTML =
          `<div class="justify-content-center">
                <div class="mx-auto card bg-dark border border-primary rounded-lg">
                  <img id="currSongImg" class="mx-auto card-img-top" src="${''}" alt="No Song Playing" style="max-width:400px">
                  <div class="mx-auto card-body text-center justify-content-center">
                    <div class="d-flex d-inline-block">
                    <h4 id="currSongName" class="mx-auto card-title">${"Song Name"}</h4>
                    <div>
                    </div></div>
                    <p id="currSongArtist" class="mx-auto card-text">${"Artist"}</p>
                    <div class="btn-group">
                      <button id="pause-play" type="button" class="d-flex mx-auto btn btn-Primary">
                        <i class="fas fa-play"> Play</i>
                      </button>
                      <button id="Skip" type="button" class="d-flex mx-auto btn btn-Primary">
                        <i class="fas fa-forward"> Skip</i>
                      </button>
                    </div>
                    <br>
                    <div class="btn-group">
                      <button type="button" id="push2playlist" class="btn btn-outline-primary">Push 2 Playlist</button>
                      <button type="button" id="push2queue" class="btn btn-outline-primary">Push 2 Queue</button>
                    </div>
                  </div>
                </div>
              </div>`
        document.getElementById("push2playlist").addEventListener('click', (e) => {
          //check if it already exists
          const spotifyURL = (`https://api.spotify.com/v1/me/playlists?limit=50`);
          var spotifyPlaylistID = '';
          $.ajax({
            url: spotifyURL,
            beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
            dataType: "json",
            success: function (tracks) {
              console.log(tracks);
              var PlayableListExists = false;
              tracks.items.forEach(playlist => {
                if (playlist.name == 'Playable List') {
                  PlayableListExists = true;
                  spotifyPlaylistID = playlist.id
                }
              });
              //creating playlist
              if (!PlayableListExists) {
                //get userID
                $.ajax({
                  type: "GET",
                  url: 'https://api.spotify.com/v1/me/',
                  beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
                  dataType: "json",
                  async: false,
                  success: function (data) {
                    var userID = data.id
                    //create playlist
                    $.ajax({
                      type: "POST",
                      url: `https://api.spotify.com/v1/users/${userID}/playlists`,
                      beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
                      data: `{"name": "Playable List","description": "Playable List","public": true}`,
                      dataType: "json",
                      async: false,
                      success: function (data) {
                        console.log("Data: " + data);
                        spotifyPlaylistID = data.id
                      }, error: function (err) {
                        console.log("Error retrieving spotify API\n", err);
                      }, complete: function (data) {
                        //console.log("complete", data)
                      }
                    });
                  }, error: function (err) {
                    console.log("Error retrieving spotify API\n", err);
                  }, complete: function (data) {
                    //console.log("complete", data)
                  }
                });
              }
              //push songs to the playlist
              playable.methods.GetAll(playlistID).call()
                .then(result => {
                  var JSONResults = JSON.parse(result);
                  JSONResults.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
                  var tracks2add = `{"uris": [`;
                  for (let index = 0; index < JSONResults.length; index++) {
                    if (index == JSONResults.length - 1)
                      tracks2add += `"${JSONResults[index].trackURI}"`;
                    else
                      tracks2add += `"${JSONResults[index].trackURI}", `;
                  }
                  tracks2add += `]}`;
                  var JSONtracks2add = JSON.parse(tracks2add);
                  $.ajax({
                    type: "POST",
                    url: `https://api.spotify.com/v1/playlists/${spotifyPlaylistID}/tracks`,
                    beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
                    dataType: "json",
                    data: tracks2add,
                    success: function (data) {
                      console.log("Data: " + data);
                    }, error: function (err) {
                      console.log(err);
                    }
                  });
                });
            }, error: function (err) {
              console.log(err);
            }
          });
        });
        document.getElementById("push2queue").addEventListener('click', (e) => {
          playable.methods.GetAll(playlistID).call()
            .then(result => {
              var JSONQueueResults = JSON.parse(result);
              JSONQueueResults.sort((a, b) => parseInt(b['weight']) - parseInt(a['weight']));
              for (let index = 0; index < JSONQueueResults.length; index++) {
                const spotifyURL = (`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(JSONQueueResults[index]['trackURI'])}`);
                $.ajax({
                  type: "POST",
                  url: spotifyURL,
                  beforeSend: function (req) { req.setRequestHeader("Authorization", "Bearer " + getCookie("spotifyToken")); },
                  dataType: "json",
                  async: false,
                  success: function (data) {
                    console.log("Data: " + data);
                  }, error: function (err) {
                    console.log(err);
                  }
                });
              }
            });
        });
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
          });
        })(i);
        for (var i = 0; i < JSONResult.length; i++) {
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
                  <input id="newWeight${i}" type="number" placeholder="Energy" class="form-control" min="0"></input>
                  <div>
                    <div class="input-group-append">
                      <span id="currWeight${i}" class="input-group-text">${JSONResult[i]["weight"]}</span>
                      <button name="increase" id="increase"${i} value="${JSONResult[i]["songID"]}" type="button" class="btn btn-outline-Primary">Increase</button>
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
        const increaseButtons = document.getElementsByName("increase");
        for (var i = 0; i < removeButtons.length; i++) {
          (function (idx) {
            var currButton = removeButtons[idx];
            removeButtons[idx].addEventListener('click', (e) => {
              e.preventDefault();
              currButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
              playable.methods.Remove(playlistID, currButton.value).send({ from: accounts[0] })
                .on("receipt", (receipt) => {
                  $getAll.click();
                })
                .catch(_e => {
                  currButton.innerHTML = '<span aria-hidden="true">&times;</span>'
                });
            });
            increaseButtons[idx].addEventListener('click', (e) => {
              e.preventDefault();
              increaseButtons[idx].innerHTML = `Updating<span class="spinner-border spinner-border-sm"></span>`;
              var newEnergy = Number(document.getElementById(`newWeight${idx+1}`).value);
              playable.methods.updateWeight(playlistID, currButton.value).send({ from: accounts[0], value: (newEnergy)})
                .on("receipt", () => {
                  $getAll.click();
                })
                .catch(_e => {
                  increaseButtons[idx].innerHTML = "Increase";
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
      })
      .catch((e) => {
        console.log(e.message);
        document.getElementById('enableEthereumButton').style.display = "initial";
      });
  }
});
