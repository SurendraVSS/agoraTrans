const APP_ID = "f34e0126cc534ec5af7629916748cda0"
var isMuteVideo = false
var isAudioVideo = false
var isTrans = false
let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid', uid)
}
var SpeechRecognition = window.webkitSpeechRecognition || window.speechRecognition;
var recognition = new webkitSpeechRecognition() || new SpeechRecognition();
var transContent = "";
var noteContent = "";
recognition.continuous = true;
var isLoggedIn = false;

let token = null;
let client;

let rtmClient;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if(!roomId){
    roomId = 'main'
}

let displayName = sessionStorage.getItem('display_name')
if(!displayName){
    window.location = 'lobby.html'
}

let localTracks = []
let remoteUsers = {}

let localScreenTracks;
let sharingScreen = false;

let joinRoomInit = async () => {
    rtmClient = await AgoraRTM.createInstance(APP_ID)
    await rtmClient.login({ uid: displayName,token})

    await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName})

    channel = await rtmClient.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleMemberJoined)
    channel.on('MemberLeft', handleMemberLeft)
    channel.on('ChannelMessage', handleChannelMessage)
    //channel.on('ChannelWhiteboard')
    channel.on('ChannelMessage', ({ text }, senderId) => {
        console.log(typeof JSON.parse(text));
        console.log("Message received successfully.");
        console.log("The message is: " + text + " by " + senderId);
        if(typeof JSON.parse(text) == 'string'){
            document.getElementById("actual-text").insertAdjacentHTML("afterend","<br> <b>Speaker:</b> " + senderId + "<br> <b>Message:</b> " + text + "<br>");
        }
    });
    getMembers()
    addBotMessageToDom(`Welcome to the room ${displayName}! 👋`)

    client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})
    await client.join(APP_ID, roomId, token, uid)

    client.on('user-published', handleUserPublished)
    client.on('user-left', handleUserLeft)
}

let channelParameters =
{
    // A variable to hold a local audio track.
    localAudioTrack: null,
    // A variable to hold a local video track.
    localVideoTrack: null,
    // A variable to hold a remote audio track.
    // remoteAudioTrack: null,
    // // A variable to hold a remote video track.
    // remoteVideoTrack: null,
    // // A variable to hold the remote user id.s
    // remoteUid: null,
};

async function transcribe(e) {
    let button = e.currentTarget

    if(isTrans == false)
    {
        document.getElementById('showTrans').style.display = 'flex'
        button.classList.remove('active')
        console.log('Voice recognition is on.');
        if (transContent.length) {
            transContent += ' ';
        }
        recognition.start();
    
        recognition.onresult = function (event) {
            var current = event.resultIndex;
            var transcript = event.results[current][0].transcript;
            transContent = transContent + transcript + "<br>";
            singleMessage = JSON.stringify(transContent);
            channel.sendMessage({ text: singleMessage }).then(() => {
                console.log("Message sent successfully.");
                console.log("Your message was: " + singleMessage + " by " + displayName);
                document.getElementById("actual-text").insertAdjacentHTML("afterbegin", "<br> <b>Speaker:</b> " + displayName + "<br> <b>Message:</b> " + singleMessage + "<br>");
                transContent = ''
            }).catch(error => {
                console.log("Message wasn't sent due to an error: ", error);
            });
        };
        isTrans = true
    }else{
        console.log('Voice recognition is off.');
        document.getElementById('showTrans').style.display = 'none'

        recognition.stop();
        button.classList.add('active')
        recognition.onresult = function (event) {
          var current = event.resultIndex;
          var transcript = event.results[current][0].transcript;
          transContent = transContent + transcript + "<br>";
          singleMessage = transContent;
          channel.sendMessage({ text: singleMessage }).then(() => {
            console.log("Message sent successfully.");
            console.log("Your message was: " + singleMessage + " by " + accountName);
            $("#actual-text").append("<br> <b>Speaker:</b> " + accountName + "<br> <b>Message:</b> " + singleMessage + "<br>");
            transContent = ''
          }).catch(error => {
            console.log("Message wasn't sent due to an error: ", error);
          });
        };
        isTrans=false
    }

   
}
let joinStream = async () => {
    document.getElementById('join-btn').style.display = 'none'
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex'

    // localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {encoderConfig:{
    //     width:{min:640, ideal:1920, max:1920},
    //     height:{min:480, ideal:1080, max:1080}
    // }})

    channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    channelParameters.localVideoTrack = await AgoraRTC.createCameraVideoTrack();



    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                 </div>`

    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player)
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

    channelParameters.localVideoTrack.play(`user-${uid}`)
    await client.publish([channelParameters.localAudioTrack, channelParameters.localVideoTrack])

    //note()

    
}

let switchToCamera = async () => {
    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                 </div>`
    displayFrame.insertAdjacentHTML('beforeend', player)

    await channelParameters.localAudioTrack.setEnabled(true)
    await channelParameters.localVideoTrack.setEnabled(true)

    document.getElementById('mic-btn').classList.remove('active')
    document.getElementById('screen-btn').classList.remove('active')

    channelParameters.localVideoTrack.play(`user-${uid}`)
    await client.publish([channelParameters.localVideoTrack])
}

let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user

    await client.subscribe(user, mediaType)

    let player = document.getElementById(`user-container-${user.uid}`)
    if(player === null){
        player = `<div class="video__container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
            </div>`

        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player)
        document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame)
   
    }

    if(displayFrame.style.display){
        let videoFrame = document.getElementById(`user-container-${user.uid}`)
        videoFrame.style.height = '100px'
        videoFrame.style.width = '100px'
    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }

    if(mediaType === 'audio'){
        user.audioTrack.play()
    }

}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    let item = document.getElementById(`user-container-${user.uid}`)
    if(item){
        item.remove()
    }

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null
        
        let videoFrames = document.getElementsByClassName('video__container')

        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }

        channelParameters.localAudioTrack.close();
        channelParameters.localVideoTrack.close();
    }
}

let toggleMic = async (e) => {
    let button = e.currentTarget

    if (isAudioVideo == false){
        await channelParameters.localAudioTrack.setEnabled(false)
        button.classList.add('active')
        isAudioVideo = true

    }else{
        await channelParameters.localAudioTrack.setEnabled(true)
        button.classList.remove('active')
        isAudioVideo = false

    }
}

let toggleCamera = async (e) => {
    let button = e.currentTarget

    if(isMuteVideo == false){
        //await localTracks[1].setMuted(false)
        await  channelParameters.localVideoTrack.setEnabled(false)

        button.classList.add('active')
        isMuteVideo = true
    }else{
       // await localTracks[1].setMuted(true)
        await  channelParameters.localVideoTrack.setEnabled(true)
        button.classList.remove('active')
        isMuteVideo = false

    }
}

let toggleScreen = async (e) => {
    let screenButton = e.currentTarget
    let cameraButton = document.getElementById('camera-btn')

    if(!sharingScreen){
        sharingScreen = true

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()
        console.log(localScreenTracks);

        document.getElementById(`user-container-${uid}`).remove()
        displayFrame.style.display = 'block'

        let player = `<div class="video__container" id="user-container-${uid}">
                <div class="video-player" id="user-${uid}"></div>
            </div>`

        displayFrame.insertAdjacentHTML('beforeend', player)
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

        userIdInDisplayFrame = `user-container-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish(channelParameters.localVideoTrack)
        await client.publish([localScreenTracks])

        let videoFrames = document.getElementsByClassName('video__container')
        for(let i = 0; videoFrames.length > i; i++){
            if(videoFrames[i].id != userIdInDisplayFrame){
              videoFrames[i].style.height = '100px'
              videoFrames[i].style.width = '100px'
            }
          }


    }else{
        sharingScreen = false 
        cameraButton.style.display = 'block'
        document.getElementById(`user-container-${uid}`).remove()
        await client.unpublish([localScreenTracks])

        switchToCamera()
    }
}

let leaveStream = async (e) => {
    e.preventDefault()

    document.getElementById('join-btn').style.display = 'block'
    document.getElementsByClassName('stream__actions')[0].style.display = 'none'
console.log('====================================');
    console.log(channelParameters);
console.log('====================================');
    // for(let i = 0; localTracks.length > i; i++){
    //     localTracks[i].stop()
    //     localTracks[i].close()
    // }
    channelParameters.localAudioTrack.close();
    channelParameters.localVideoTrack.close();
    //await client.unpublish([localTracks[0], localTracks[1]])
    await client.unpublish([channelParameters.localAudioTrack, channelParameters.localVideoTrack])

    if(localScreenTracks){
        await client.unpublish([localScreenTracks])
    }

    document.getElementById(`user-container-${uid}`).remove()

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null

        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }

    channel.sendMessage({text:JSON.stringify({'type':'user_left', 'uid':uid})})
}


// let note = async () => {
//     console.log('Voice recognition is on.');
    
//     if (noteContent.length) {
//         noteContent += ' ';
//     }

//     recognition.start();
//     recognition.onresult = function (event) {
//         var current = event.resultIndex;
//         var transcript = event.results[current][0].transcript;
//         noteContent = noteContent + transcript + "<br>";
//         document.getElementById("note-text").insertAdjacentHTML("afterend","<b><i>You said: </i></b> " + noteContent);
//         noteContent = '';
//     };
// }
// recognition.onerror = function (event) {
//     if (event.error == 'no-speech') {
//         console.log('Could you please repeat? I didn\'t get what you\'re saying.');
//         recognition.stop();
//         recognition.start();
//     }
// }
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('screen-btn').addEventListener('click', toggleScreen)
document.getElementById('join-btn').addEventListener('click', joinStream)
document.getElementById('leave-btn').addEventListener('click', leaveStream)
document.getElementById('transcribe-btn').addEventListener('click', transcribe)

joinRoomInit()

// note()