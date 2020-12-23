// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.5.0;
/**
 * @title Playable List v1.3
 * @dev Greyson Latinwo Jones
 */

contract PlayableList
{
    //logs the song added and its playlist
    event playlistAltered(
        address playlistID,
        uint songID,
        uint weight,
        uint entryCost,
        string trackURI
    );
    event Print(string data);
    event Print(address data);
    event Print(uint data);
    
    //song struct
    struct Song 
    {
        uint songID;
        uint weight;
        string albumURI;
        string albumImage;
        uint trackIndex;
        string trackURI;
        string trackName;
        string artist;
        string misc;
    }
    
    struct playlist
    {
        uint entryCost;
        Song[] List;
    }

    //mapping(address => Song[]) private playlists;
    //mapping(address => uint) private entryCosts;
    mapping(address => playlist) private playlistDict;
    address payable dev = msg.sender;
    string public version = '0.2';
    
    function setEntryCost() public payable {
        if(playlistDict[msg.sender].entryCost < msg.value)
            dev.transfer(msg.value);
        playlistDict[msg.sender].entryCost = msg.value;
    }
    
    function getEntryCost(address listID) public view returns(uint){
        return playlistDict[listID].entryCost;
    }
    
    //adds song to the list
    function AddSong(string memory albumURI, string memory albumImage, uint trackIndex, string memory trackURI, string memory trackName, string memory artist, string memory misc, address payable listID) public payable {
        require(!StringEqual(trackURI, ""));
        require(trackIndex != 0);
        require(listID != address(0));
        require(msg.value >= playlistDict[msg.sender].entryCost);
        Song[] storage playlistList = playlistDict[listID].List;
        uint entryCost = playlistDict[listID].entryCost;
        playlistList.push(Song(playlistList.length+1, msg.value, albumURI, albumImage, trackIndex, trackURI, trackName, artist, misc));
        //payment logic
        if(msg.value > 0){
            uint money = msg.value;
            uint playlistOwnerPayment = entryCost;
            money -= entryCost;
            playlistOwnerPayment += (money / 2);
            if(playlistOwnerPayment > 0)
                listID.transfer(playlistOwnerPayment);
            if(msg.value - playlistOwnerPayment > 0)
                dev.transfer(msg.value - playlistOwnerPayment);
        }
        emit playlistAltered(listID, playlistList.length+1, msg.value, playlistDict[listID].entryCost, trackURI);
    }
    
    function updateWeight(address payable listID, uint SongID) public payable{
        require(listID != address(0));
        require(SongID != 0);
        if(playlistDict[listID].List[SongID-1].songID != 0){
            playlistDict[listID].List[SongID-1].weight += msg.value;
        }
    }
    
    //gets song at given playlist index and song index
    function Get(address listID, uint givenSongID) view public returns(string memory) {
        Song storage currSong = playlistDict[listID].List[givenSongID-1];
        return string(abi.encodePacked(
            '{ ',
            '"songID":',uint2str(currSong.songID),", ",
            '"weight":',uint2str(currSong.weight),", ",
            '"albumURI":"',currSong.albumURI,'", ',
            '"albumImage":"',currSong.albumImage,'", ',
            '"trackIndex":',uint2str(currSong.trackIndex),', ',
            '"trackURI":"',currSong.trackURI,'", ',
            '"trackName":"',currSong.trackName,'", ',
            '"artist":"',currSong.artist,'", ',
            '"misc":"',currSong.misc,'" ',
            ' }')
        );
    }

    function GetAll(address listID) view public returns(string memory){
        string memory songs = "[";
        for(uint i = 1; i <= playlistDict[listID].List.length; i++){
            if(i == playlistDict[listID].List.length){
                songs = string(abi.encodePacked(songs, Get(listID, i)));
            }else{
                songs = string(abi.encodePacked(songs, Get(listID, i), ", "));
            }
        }
        songs = string(abi.encodePacked(songs, "]"));
        return songs;
    }
    
    //removes song at given index from list
    function Remove(address payable listID, uint givenSongID) public payable {
        require(listID != address(0));
        uint arrIdx = givenSongID-1;
        Song memory song2Remove = playlistDict[listID].List[arrIdx];
        Song[] storage playlistList = playlistDict[listID].List;
        for(uint i = arrIdx; i < playlistList.length-1; i++){
            playlistList[i] = playlistList[i+1];
            playlistList[i].songID = i+1;
        }
        
        playlistList.pop();
        if(song2Remove.weight <= msg.value){
            uint money = msg.value;
            uint entryCost = playlistDict[listID].entryCost;
            uint playlistOwnerPayment = entryCost;
            money -= entryCost;
            playlistOwnerPayment += (money / 2);
            if(playlistOwnerPayment > 0)
                listID.transfer(playlistOwnerPayment);
            if(msg.value - playlistOwnerPayment > 0)
                dev.transfer(msg.value - playlistOwnerPayment);
        }
        emit playlistAltered(listID, playlistList.length+1, msg.value, playlistDict[listID].entryCost, song2Remove.trackURI);
    }
    
    //check if 2 strings are equal
    function StringEqual(string memory a, string memory b) pure internal returns(bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
    
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}